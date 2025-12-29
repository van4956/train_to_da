"""
Serverless функция для проверки ответов пользователя через OpenAI API.
"""

import json
import os
from http.server import BaseHTTPRequestHandler
from openai import OpenAI # type: ignore


class handler(BaseHTTPRequestHandler):
    """
    Обработчик запросов от фронтенда для Vercel Serverless Functions.
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
        """Обработка POST запроса"""
        try:
            # Читаем тело запроса
            content_length = int(self.headers.get('Content-Length', 0))
            body_content = self.rfile.read(content_length).decode('utf-8')

            print(f"Received body: {body_content}")
            body = json.loads(body_content)

            question = body.get('question', '').strip()
            expected_answer = body.get('expected_answer', '').strip()
            user_answer = body.get('user_answer', '').strip()

            print(f"Parsed: question={len(question)} chars, expected={len(expected_answer)} chars, user={len(user_answer)} chars")

            # Валидация входных данных
            if not question or not expected_answer or not user_answer:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    'error': 'Отсутствуют обязательные поля: question, expected_answer, user_answer'
                }, ensure_ascii=False).encode('utf-8'))
                return

            # Получаем настройки из ENV
            api_key = os.environ.get('OPENAI_API_KEY')
            model = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')

            if not api_key:
                self._set_headers(500)
                self.wfile.write(json.dumps({
                    'error': 'API ключ не настроен'
                }, ensure_ascii=False).encode('utf-8'))
                return

            # Инициализируем OpenAI клиент
            print(f"Initializing OpenAI with model: {model}")
            client = OpenAI(api_key=api_key)

            # Формируем системный промпт для GPT
            prompt_sistem = """Вы — технический интервьюер, проводящий лайт-интервью на знание теории и практических основ (Data / ML / SQL / аналитика).
Перед вами кандидат, который отвечает письменно. Общайтесь с кандидатом на «Вы», в вежливом, профессиональном и нейтральном тоне.

Ваша задача — оценить ответ кандидата по смыслу, а не по буквальному совпадению с эталонным ответом.
Эталонный ответ — это ориентир, а не строгий чек-лист. Если кандидат объяснил идею корректно, своими словами, с другой структурой или примерами, это считается правильным ответом.

**Критерии оценки:**
— понимание ключевой идеи вопроса
— корректность логики и терминов
— глубину объяснения относительно уровня вопроса

**Не занижайте оценку за:**
— отсутствие отдельных слов из эталона
— отличающиеся формулировки
— иной порядок изложения

**Снижайте оценку, если:**
— ответ поверхностный или расплывчатый
— кандидат уходит от сути вопроса
— присутствуют логические ошибки
— ответ пустой, формальный («не знаю», «сложно сказать», попытки уговоров)

**Формат ответа (строго JSON):**
{{
  "score": <число от 0 до 10>,
  "feedback": "<краткий фидбек 2-3 предложения на русском>"
}}

В feedback:
— сначала кратко оцените ответ («Это хороший ответ», «Ответ частично верный», и т.п.)
— укажите, что именно кандидат понял правильно
— при необходимости мягко укажите, чего не хватило или что можно улучшить
— не используйте резкий или обвинительный тон

Не добавляй никаких пояснений вне JSON. Верни только JSON."""

            # Формируем юзер промпт для GPT
            prompt_user = f"""Вы — технический интервьюер, проводящий лайт-интервью.

Ваша задача — оценить ответ кандидата по смыслу, а не по буквальному совпадению с эталонным ответом.

**Вопрос:**
{question}

**Эталонный ответ:**
{expected_answer}

**Ответ кандидата:**
{user_answer}

**Формат ответа (строго JSON):**
{{
  "score": <число от 0 до 10>,
  "feedback": "<краткий фидбек 2-3 предложения на русском>"
}}"""

            # Запрос к OpenAI API
            print("Sending request to OpenAI...")
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": prompt_sistem
                    },
                    {
                        "role": "user",
                        "content": prompt_user
                    }
                ],
                temperature=0.7,
                max_tokens=400,
                response_format={"type": "json_object"}
            )

            # Извлекаем ответ
            result_text = response.choices[0].message.content.strip()
            print(f"GPT Response: {result_text}")
            result = json.loads(result_text)

            # Валидация результата
            score = result.get('score')
            feedback = result.get('feedback', '')

            if not isinstance(score, (int, float)) or not (1 <= score <= 10):
                raise ValueError('Некорректная оценка от GPT')

            if not feedback:
                raise ValueError('Пустой фидбек от GPT')

            # Возвращаем результат
            result_data = {
                'score': int(score),
                'feedback': feedback
            }
            print(f"Returning: {result_data}")

            self._set_headers(200)
            self.wfile.write(json.dumps(result_data, ensure_ascii=False).encode('utf-8'))

        except json.JSONDecodeError as e:
            print(f"JSON Error: {str(e)}")
            self._set_headers(400)
            self.wfile.write(json.dumps({
                'error': f'Неверный формат JSON: {str(e)}'
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
