"""
Serverless функция для преобразования речи в текст через OpenAI Whisper API.
"""

import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler
from openai import OpenAI  # type: ignore


# Максимальный размер файла (25 MB - лимит Whisper API)
MAX_FILE_SIZE = 25 * 1024 * 1024

# Поддерживаемые форматы аудио
SUPPORTED_FORMATS = {'.webm', '.ogg', '.mp3', '.wav', '.m4a'}


def parse_multipart_form_data(body: bytes, boundary: bytes) -> dict:
    """
    Парсит multipart/form-data и извлекает файлы и поля.

    Args:
        body: Тело запроса
        boundary: Граница multipart (из заголовка Content-Type)

    Returns:
        Словарь с полями формы, включая файлы
    """
    parts = body.split(b'--' + boundary)
    form_data = {}

    for part in parts:
        if not part.strip() or part == b'--\r\n':
            continue

        # Разделяем заголовки и содержимое
        if b'\r\n\r\n' not in part:
            continue

        headers_raw, content = part.split(b'\r\n\r\n', 1)
        headers = {}

        # Парсим заголовки
        for line in headers_raw.decode('utf-8', errors='ignore').split('\r\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                headers[key.strip().lower()] = value.strip()

        # Извлекаем имя поля из Content-Disposition
        content_disposition = headers.get('content-disposition', '')
        field_name = None
        filename = None

        if 'name=' in content_disposition:
            # Извлекаем name="field_name"
            name_start = content_disposition.find('name="') + 6
            name_end = content_disposition.find('"', name_start)
            if name_end > name_start:
                field_name = content_disposition[name_start:name_end]

        if 'filename=' in content_disposition:
            # Извлекаем filename="file.webm"
            filename_start = content_disposition.find('filename="') + 10
            filename_end = content_disposition.find('"', filename_start)
            if filename_end > filename_start:
                filename = content_disposition[filename_start:filename_end]

        # Убираем завершающие \r\n из содержимого
        content = content.rstrip(b'\r\n')

        if field_name:
            if filename:
                # Это файл
                form_data[field_name] = {
                    'filename': filename,
                    'content': content,
                    'content_type': headers.get('content-type', 'application/octet-stream')
                }
            else:
                # Это обычное поле
                form_data[field_name] = content.decode('utf-8', errors='ignore')

    return form_data


class handler(BaseHTTPRequestHandler):
    """
    Обработчик запросов от фронтенда для транскрибации аудио через Whisper API.
    """

    def _set_headers(self, status_code=200):
        """Установка CORS заголовков"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        """Обработка preflight запроса"""
        self._set_headers(200)
        self.wfile.write(b'')

    def do_POST(self):
        """Обработка POST запроса с multipart/form-data"""
        try:
            # Получаем Content-Type для определения boundary
            content_type = self.headers.get('Content-Type', '')
            if 'multipart/form-data' not in content_type:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    'error': 'Ожидается multipart/form-data'
                }, ensure_ascii=False).encode('utf-8'))
                return

            # Извлекаем boundary из Content-Type
            boundary = None
            for part in content_type.split(';'):
                part = part.strip()
                if part.startswith('boundary='):
                    boundary = part[9:].strip('"')
                    break

            if not boundary:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    'error': 'Не найден boundary в Content-Type'
                }, ensure_ascii=False).encode('utf-8'))
                return

            # Читаем тело запроса
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    'error': 'Пустое тело запроса'
                }, ensure_ascii=False).encode('utf-8'))
                return

            if content_length > MAX_FILE_SIZE:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    'error': f'Файл слишком большой. Максимальный размер: {MAX_FILE_SIZE // (1024 * 1024)} MB'
                }, ensure_ascii=False).encode('utf-8'))
                return

            body = self.rfile.read(content_length)

            # Парсим multipart/form-data
            form_data = parse_multipart_form_data(body, boundary.encode('utf-8'))

            # Проверяем наличие поля 'audio'
            if 'audio' not in form_data:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    'error': 'Отсутствует поле audio'
                }, ensure_ascii=False).encode('utf-8'))
                return

            audio_data = form_data['audio']

            # Проверяем, что это файл
            if not isinstance(audio_data, dict) or 'content' not in audio_data:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    'error': 'Поле audio должно содержать файл'
                }, ensure_ascii=False).encode('utf-8'))
                return

            audio_content = audio_data['content']
            filename = audio_data.get('filename', 'audio.webm')

            # Проверяем размер файла
            if len(audio_content) > MAX_FILE_SIZE:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    'error': f'Файл слишком большой. Максимальный размер: {MAX_FILE_SIZE // (1024 * 1024)} MB'
                }, ensure_ascii=False).encode('utf-8'))
                return

            # Проверяем формат файла
            file_ext = None
            if '.' in filename:
                file_ext = '.' + filename.rsplit('.', 1)[1].lower()

            if file_ext and file_ext not in SUPPORTED_FORMATS:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    'error': f'Неподдерживаемый формат файла. Поддерживаются: {", ".join(SUPPORTED_FORMATS)}'
                }, ensure_ascii=False).encode('utf-8'))
                return

            # Получаем API ключ из ENV
            api_key = os.environ.get('OPENAI_API_KEY')
            if not api_key:
                self._set_headers(500)
                self.wfile.write(json.dumps({
                    'error': 'API ключ не настроен'
                }, ensure_ascii=False).encode('utf-8'))
                return

            # Инициализируем OpenAI клиент
            client = OpenAI(api_key=api_key)

            # Сохраняем аудио во временный файл
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext or '.webm') as tmp_file:
                tmp_file.write(audio_content)
                tmp_file_path = tmp_file.name

            try:
                # Вызываем Whisper API
                print(f"Transcribing audio file: {filename}, size: {len(audio_content)} bytes")
                with open(tmp_file_path, 'rb') as audio_file:
                    transcript = client.audio.transcriptions.create(
                        model='whisper-1',
                        file=audio_file,
                        language='ru',  # Явно указываем русский язык
                        response_format='text'
                    )

                # Извлекаем текст (response_format='text' возвращает строку напрямую)
                text = transcript.strip() if transcript else ""

                print(f"Transcription successful: {len(text)} characters")

                # Возвращаем результат
                result_data = {
                    'text': text
                }

                self._set_headers(200)
                self.wfile.write(json.dumps(result_data, ensure_ascii=False).encode('utf-8'))

            finally:
                # Удаляем временный файл
                try:
                    os.unlink(tmp_file_path)
                except Exception:
                    pass

        except json.JSONDecodeError as e:
            print(f"JSON Error: {str(e)}")
            self._set_headers(400)
            self.wfile.write(json.dumps({
                'error': f'Ошибка обработки запроса: {str(e)}'
            }, ensure_ascii=False).encode('utf-8'))

        except Exception as e:
            # Логируем ошибку (видно в Vercel Logs)
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()

            self._set_headers(500)
            self.wfile.write(json.dumps({
                'error': 'Внутренняя ошибка сервера. Попробуйте позже.'
            }, ensure_ascii=False).encode('utf-8'))
