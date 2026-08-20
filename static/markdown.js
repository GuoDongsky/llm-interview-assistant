/**
 * 轻量 Markdown 渲染器。
 *
 * 只覆盖 app/prompts.py 实际会让模型产出的语法：标题、列表、表格、引用、
 * 分隔线、粗体、行内代码。不追求完整 CommonMark 规范。
 *
 * 安全约定：所有文本在拼进 HTML 前一律经过 escapeHtml，渲染器永远不会把
 * 原文当作 HTML 插入。调用方可以放心地把返回值赋给 innerHTML。
 */
(function (global) {
  "use strict";

  var LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  var ORDERED_RE = /^\d+[.)]$/;
  var HEADING_RE = /^ {0,3}(#{1,6})\s+(.*)$/;
  var HR_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
  var QUOTE_RE = /^\s*>\s?/;
  var TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;

  var ESCAPES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"};

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (ch) {
      return ESCAPES[ch];
    });
  }

  /**
   * 行内标记。先把代码片段摘出来占位，避免代码里的 ** 被当成粗体，
   * 再统一转义，最后把代码还原回去。
   */
  function renderInline(raw) {
    var codes = [];
    var text = String(raw).replace(/`([^`\n]+)`/g, function (match, body) {
      codes.push(body);
      return "\u0000C" + (codes.length - 1) + "\u0000";
    });

    text = escapeHtml(text);
    text = text.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");

    return text.replace(/\u0000C(\d+)\u0000/g, function (match, index) {
      return "<code>" + escapeHtml(codes[Number(index)]) + "</code>";
    });
  }

  function isTableRow(line) {
    return line.indexOf("|") !== -1 && /\S/.test(line);
  }

  function isTableStart(lines, index) {
    return (
      isTableRow(lines[index]) &&
      index + 1 < lines.length &&
      TABLE_SEP_RE.test(lines[index + 1])
    );
  }

  function splitRow(line) {
    var text = line.trim();
    if (text.charAt(0) === "|") {
      text = text.slice(1);
    }
    if (text.charAt(text.length - 1) === "|") {
      text = text.slice(0, -1);
    }
    return text.split("|").map(function (cell) {
      return cell.trim();
    });
  }

  function alignOf(spec) {
    var left = spec.charAt(0) === ":";
    var right = spec.charAt(spec.length - 1) === ":";
    if (left && right) {
      return " style=\"text-align:center\"";
    }
    if (right) {
      return " style=\"text-align:right\"";
    }
    return "";
  }

  function renderTable(lines, start) {
    var header = splitRow(lines[start]);
    var aligns = splitRow(lines[start + 1]).map(alignOf);
    var parts = ["<div class=\"md-table-wrap\"><table><thead><tr>"];

    header.forEach(function (cell, index) {
      parts.push("<th" + (aligns[index] || "") + ">" + renderInline(cell) + "</th>");
    });
    parts.push("</tr></thead><tbody>");

    var i = start + 2;
    while (i < lines.length && lines[i].trim() && isTableRow(lines[i])) {
      var cells = splitRow(lines[i]);
      parts.push("<tr>");
      for (var col = 0; col < header.length; col += 1) {
        parts.push(
          "<td" + (aligns[col] || "") + ">" + renderInline(cells[col] || "") + "</td>",
        );
      }
      parts.push("</tr>");
      i += 1;
    }

    parts.push("</tbody></table></div>");
    return {html: parts.join(""), next: i};
  }

  function renderList(lines, start) {
    var first = lines[start].match(LIST_RE);
    var baseIndent = first[1].length;
    var ordered = ORDERED_RE.test(first[2]);
    var tag = ordered ? "ol" : "ul";
    var parts = ["<" + tag + ">"];
    var itemOpen = false;
    var i = start;

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) {
        // 空行只有在下一行仍属于本列表时才跳过，否则列表结束。
        var next = lines[i + 1];
        var continues = next && LIST_RE.test(next) && next.match(LIST_RE)[1].length >= baseIndent;
        if (continues) {
          i += 1;
          continue;
        }
        break;
      }

      var item = line.match(LIST_RE);

      if (!item) {
        // 缩进的非列表行视为上一条的延续文本。
        if (itemOpen && /^\s+\S/.test(line)) {
          parts.push(" " + renderInline(line.trim()));
          i += 1;
          continue;
        }
        break;
      }

      var indent = item[1].length;

      if (indent > baseIndent) {
        var nested = renderList(lines, i);
        parts.push(nested.html);
        i = nested.next;
        continue;
      }

      if (indent < baseIndent || ORDERED_RE.test(item[2]) !== ordered) {
        break;
      }

      if (itemOpen) {
        parts.push("</li>");
      }
      parts.push("<li>" + renderInline(item[3]));
      itemOpen = true;
      i += 1;
    }

    if (itemOpen) {
      parts.push("</li>");
    }
    parts.push("</" + tag + ">");
    return {html: parts.join(""), next: i};
  }

  function startsBlock(lines, index) {
    var line = lines[index];
    return (
      HR_RE.test(line) ||
      HEADING_RE.test(line) ||
      QUOTE_RE.test(line) ||
      LIST_RE.test(line) ||
      isTableStart(lines, index)
    );
  }

  function renderMarkdown(source) {
    if (!source) {
      return "";
    }

    var lines = String(source).replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) {
        i += 1;
        continue;
      }

      if (HR_RE.test(line)) {
        out.push("<hr />");
        i += 1;
        continue;
      }

      var heading = line.match(HEADING_RE);
      if (heading) {
        var level = Math.min(heading[1].length, 4);
        out.push("<h" + level + ">" + renderInline(heading[2].trim()) + "</h" + level + ">");
        i += 1;
        continue;
      }

      if (isTableStart(lines, i)) {
        var table = renderTable(lines, i);
        out.push(table.html);
        i = table.next;
        continue;
      }

      if (QUOTE_RE.test(line)) {
        var quoted = [];
        while (i < lines.length && QUOTE_RE.test(lines[i])) {
          quoted.push(lines[i].replace(QUOTE_RE, ""));
          i += 1;
        }
        out.push("<blockquote>" + renderMarkdown(quoted.join("\n")) + "</blockquote>");
        continue;
      }

      if (LIST_RE.test(line)) {
        var list = renderList(lines, i);
        out.push(list.html);
        i = list.next;
        continue;
      }

      var paragraph = [];
      while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) {
        paragraph.push(lines[i].trim());
        i += 1;
      }
      out.push("<p>" + renderInline(paragraph.join("\n")).replace(/\n/g, "<br />") + "</p>");
    }

    return out.join("\n");
  }

  global.renderMarkdown = renderMarkdown;
  global.escapeHtml = escapeHtml;
})(window);
