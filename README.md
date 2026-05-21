# LLM 闈㈣瘯鍔╂墜

涓€涓湰鍦拌繍琛岀殑 AI 闈㈣瘯鍔╂墜 Web 宸ュ叿锛岄潰鍚?HR銆佹嫑鑱樿礋璐ｄ汉鍜岄潰璇曞畼銆傚畠鍙互瑙ｆ瀽闈㈣瘯璁板綍銆佸€欓€変汉绠€鍘嗗拰宀椾綅淇℃伅锛屽熀浜?DeepSeek 鐢熸垚闈㈣瘯鎬荤粨銆侀潰璇曞缓璁拰宀椾綅鍖归厤鍒嗘瀽銆?
## 鍔熻兘

- 闈㈣瘯璁板綍涓婁紶鍜岀紪杈戯細鏀寔 `txt`銆乣md`銆乣docx`
- 鍊欓€変汉绠€鍘嗕笂浼犲拰缂栬緫锛氭敮鎸?`docx`銆佸彲澶嶅埗鏂囨湰鍨?`pdf`
- 宀椾綅淇℃伅杈撳叆锛氭敮鎸佷竴娆℃€х矘璐村矖浣嶅悕绉般€丣D銆佷换鑱岃姹?- 闈㈣瘯鎬荤粨锛氫粎浣跨敤闈㈣瘯璁板綍浣滀负鏁版嵁婧?- 闈㈣瘯寤鸿锛氱粨鍚堝矖浣嶄俊鎭€佺畝鍘嗐€佸墠搴忛潰璇曡褰曞拰鏈疆闈㈣瘯璁剧疆鐢熸垚寤鸿
- 宀椾綅鍖归厤鍒嗘瀽锛氱粨鍚堥潰璇曡褰曘€佺畝鍘嗗拰宀椾綅淇℃伅锛屽尯鍒嗏€滅畝鍘嗚瘉鎹€濆拰鈥滈潰璇曡瘉鎹€?- 娴佸紡杈撳嚭锛氱敓鎴愬唴瀹逛細瀹炴椂鏄剧ず
- 鎻愮ず璇嶅彲缂栬緫銆佷繚瀛樺埌娴忚鍣ㄦ湰鍦般€佹仮澶嶉粯璁?- 涓嶄娇鐢ㄦ暟鎹簱锛屼笉淇濆瓨闈㈣瘯璁板綍銆佺畝鍘嗐€丣D 鎴栧垎鏋愮粨鏋?- API Key 鍙敱鍚庣璇诲彇锛屼笉鏆撮湶缁欐祻瑙堝櫒

## 鎶€鏈爤

- 鍚庣锛欶astAPI
- LLM锛欴eepSeek锛屼娇鐢?OpenAI SDK 鍏煎鎺ュ彛
- 鏂囦欢瑙ｆ瀽锛歱ython-docx銆丳yMuPDF
- 鍓嶇锛氬師鐢?HTML / CSS / JavaScript

## 蹇€熷紑濮?
### 1. 鍑嗗鐜

闇€瑕?Python 3.10+銆?
```bash
python -m venv .venv
```

Windows:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

macOS / Linux:

```bash
./.venv/bin/python -m pip install -r requirements.txt
```

### 2. 閰嶇疆 DeepSeek API Key

澶嶅埗閰嶇疆鏂囦欢锛?
Windows:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

缂栬緫 `.env`锛?
```env
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
LLM_TIMEOUT_SECONDS=60
```

涓嶈鎻愪氦鐪熷疄 `.env` 鏂囦欢銆?
### 3. 鍚姩

Windows 鏃ュ父浣跨敤鍙互鍙屽嚮锛?
```text
open-app.bat
```

鍙惎鍔ㄦ湇鍔″彲浠ュ弻鍑伙細

```text
start-server.bat
```

macOS / Linux:

```bash
chmod +x start-server.sh open-app.command
./open-app.command
```

涔熷彲浠ユ墜鍔ㄥ惎鍔細

Windows:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

macOS / Linux:

```bash
./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

鎵撳紑锛?
```text
http://127.0.0.1:8000
```

## 鏁版嵁鍜岄殣绉?
- 鏈」鐩笉浣跨敤鏁版嵁搴撱€?- 涓婁紶鐨勯潰璇曡褰曘€佺畝鍘嗗拰宀椾綅淇℃伅鍙繚鐣欏湪褰撳墠娴忚鍣ㄩ〉闈㈠拰鏈璇锋眰涓€?- 鐢熸垚鏃讹紝鐩稿叧鏂囨湰浼氬彂閫佺粰 DeepSeek API 杩涜鎺ㄧ悊銆?- API Key 鍙瓨鏀惧湪鏈嶅姟绔?`.env` 鎴栫幆澧冨彉閲忎腑锛屽墠绔笉浼氳鍙栨垨鏄剧ず銆?- 鎻愮ず璇嶆ā鏉夸細淇濆瓨鍒版祻瑙堝櫒 `localStorage`锛屼笉鍖呭惈 API Key銆?
## 鏀寔鐨勬枃浠舵牸寮?
闈㈣瘯璁板綍锛?
- `.txt`
- `.md`
- `.markdown`
- `.docx`

鍊欓€変汉绠€鍘嗭細

- `.docx`
- 鍙鍒舵枃鏈瀷 `.pdf`

鎵弿鐗?PDF 鏆備笉鏀寔 OCR銆?
## 寮€鍙?
杩愯鍩虹妫€鏌ワ細

```bash
python -m compileall app
```

濡傚畨瑁呬簡 Node.js锛屽彲妫€鏌ュ墠绔剼鏈娉曪細

```bash
node --check static/app.js
```

## 寮€婧愬墠鎻愰啋

鍙戝竷鍒?GitHub 鍓嶈纭锛?
- `.env` 娌℃湁琚彁浜?- `.venv/` 娌℃湁琚彁浜?- `__pycache__/` 娌℃湁琚彁浜?- 娌℃湁涓婁紶鐪熷疄闈㈣瘯璁板綍銆佺畝鍘嗘垨宀椾綅 JD
- 娌℃湁涓婁紶鍖呭惈鍊欓€変汉涓汉淇℃伅鐨勬祴璇曟枃浠?
