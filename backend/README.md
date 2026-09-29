# Backend FFmpeg dla FreeCut

Ten katalog zawiera gotowy, lekki mikroserwis Node.js + FFmpeg, który odbiera materiały wideo z FreeCut, renderuje je natywnym silnikiem FFmpeg i odsyła gotowy plik wyjściowy (np. MP4 H.264, WebM, MKV, GIF).

---

## Jak wdrożyć backend całkowicie za darmo (100% Free)

Do wyboru masz kilka sprawdzonych platform oferujących darmowy hosting z obsługą Dockera i FFmpeg:

---

### Opcja 1: Hugging Face Spaces (Najlepsza – 2 vCPU, 16 GB RAM za darmo!)
Hugging Face oferuje darmowe „Docker Spaces” z 2 rdzeniami CPU i aż 16 GB pamięci RAM, bez karty kredytowej:

1. Wejdź na [huggingface.co](https://huggingface.co) i zaloguj się / załóż darmowe konto.
2. Kliknij **Spaces** → **Create new Space**.
3. Wpisz nazwę (np. `freecut-renderer`).
4. Jako **Space SDK** wybierz **Docker** → **Blank**.
5. Wybierz plan darmowy: **CPU basic (2 vCPU, 16 GB RAM) - Free**.
6. W utworzonym Space wejdź w zakładkę **Files** i wrzuć zawartość tego katalogu `backend`:
   - `Dockerfile`
   - `package.json`
   - `index.js`
7. Po minucie Space się zbuduje. Adres URL Twojego backendu będzie miał postać:
   `https://[twoja-nazwa-uzytkownika]-[nazwa-space].hf.space`
8. Wejdź w FreeCut → **Ustawienia** → **Silnik renderowania** → wklej ten URL.

---

### Opcja 2: Render.com (Darmowy Web Service)
1. Załóż darmowe konto na [render.com](https://render.com).
2. Kliknij **New +** → **Web Service**.
3. Połącz swoje repozytorium GitHub.
4. Ustaw:
   - **Root Directory**: `backend`
   - **Environment**: `Docker`
   - **Instance Type**: `Free`
5. Kliknij **Create Web Service**.
6. Po wdrożeniu otrzymasz darmowy adres URL (np. `https://twoj-projekt.onrender.com`).
*(Uwaga: w planie darmowym Render usypia serwer po 15 min bezczynności; pierwsze zapytanie może zająć ~30-50 sekund na wybudzenie).*

---

### Opcja 3: Koyeb (Darmowy Eco Tier)
1. Zarejestruj się na [koyeb.com](https://www.koyeb.com).
2. Utwórz nową usługę (**Create App** / **Service**).
3. Wybierz **GitHub**, wskaż repozytorium i ustaw katalog źródłowy na `/backend`.
4. Wybierz darmowy plan **Eco (512MB RAM)**.
5. Port ustaw na `3000`.
6. Po uruchomieniu otrzymasz publiczny adres HTTPS (np. `https://xxx.koyeb.app`).

---

### Opcja 4: Lokalne uruchomienie (na własnym komputerze)
Możesz także renderować wideo na swoim własnym komputerze (bez żadnych limitów chmury):
1. Zainstaluj `ffmpeg` w systemie (`sudo apt install ffmpeg` na Ubuntu/Debian lub `brew install ffmpeg` na macOS, lub pobierz dla Windows).
2. Przejdź do folderu backendu:
   ```bash
   cd backend
   npm install
   PORT=3001 npm start
   ```
3. W FreeCut podaj adres: `http://localhost:3001`.
