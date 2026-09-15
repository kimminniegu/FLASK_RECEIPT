import os
import json
from flask import Flask, render_template, request, jsonify
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route('/')
def index():
    return render_template('index.html')

# 영수증 수치 연산 엔드포인트
@app.route('/api/generate-receipt', methods=['POST'])
def generate_receipt():
    data = request.json or {}
    tasks = data.get('tasks', [])
    mood = data.get('mood', 'NEUTRAL')
    
    total_items = len(tasks)
    formatted_time = datetime.now().strftime("%Y.%m.%d %H:%M:%S")
    energy_used = total_items * 18.5
    
    return jsonify({
        'status': 'success',
        'timestamp': formatted_time,
        'tasks': tasks,
        'mood': mood,
        'total_items': total_items,
        'energy_used': f"{energy_used:.1f} kcal",
        'order_id': f"IMP-{datetime.now().strftime('%m%d%H%M')}"
    })

# OpenAI 일과 요약 및 번역 엔드포인트
@app.route('/api/ai-summarize', methods=['POST'])
def ai_summarize():
    data = request.json or {}
    user_input = data.get('message', '').strip()
    target_lang = data.get('lang', 'EN')

    if not user_input:
        return jsonify({'error': '일과 내용을 입력해주세요.'}), 400

    lang_instruction = (
        "Translate and format the tasks and mood into concise, stylish ENGLISH receipt items."
        if target_lang == 'EN'
        else "Translate and format the tasks and mood into concise KOREAN receipt items."
    )

    prompt = f"""
You are an intelligent daily-log assistant for a stylish receipt generator.
User's story about today:
"{user_input}"

Instructions:
1. Extract 3 to 6 key specific action items / events from the story.
2. Formulate a short, punchy 1-3 word mood summary (e.g., 'COFFEE OVERLOAD', 'PEACEFUL CALM', 'CHAOTIC PRODUCTIVE').
3. {lang_instruction}
4. Respond ONLY with valid JSON matching this exact structure:
{{
    "mood": "EXTRACTED_MOOD",
    "tasks": ["Task 1", "Task 2", "Task 3"]
}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You output strictly valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        
        parsed_result = json.loads(response.choices[0].message.content)
        return jsonify(parsed_result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)