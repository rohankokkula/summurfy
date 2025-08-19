from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Groq API configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Murf AI configuration
MURF_API_KEY = os.getenv("MURF_API_KEY", "ap2_c1101b1a-fbc0-400c-a817-bd6c87dec084")
MURF_API_URL = "https://api.murf.ai/v1/speech/generate"

def convert_to_speech(text, voice_id="en-US-natalie"):
    """Convert text to speech using Murf AI"""
    try:
        print(f"Attempting to convert text to speech: {text[:100]}...")
        print(f"Using voice: {voice_id}")
        print(f"Using API key: {MURF_API_KEY[:10]}...")
        print(f"API URL: {MURF_API_URL}")
        
        headers = {
            "api-key": MURF_API_KEY
        }
        
        payload = {
            "text": text,
            "voiceId": voice_id,
            "pronunciationDictionary": {
                "2025": {
                    "pronunciation": "twenty twenty five",
                    "type": "SAY_AS"
                },
                "lakh": {
                    "pronunciation": "lakh",
                    "type": "SAY_AS"
                },
                "crore": {
                    "pronunciation": "crore",
                    "type": "SAY_AS"
                }
            },
            "audioDuration": 0,
            "channelType": "MONO",
            "encodeAsBase64": False,
            "format": "WAV",
            "modelVersion": "GEN2",
            "multiNativeLocale": "",
            "pitch": 0,
            "rate": 0,
            "sampleRate": 44100,
            "style": "",
            "variation": 1,
            "wordDurationsAsOriginalText": False
        }
        
        print(f"Request payload: {payload}")
        print(f"Request headers: {headers}")
        
        response = requests.post(MURF_API_URL, headers=headers, json=payload, timeout=30)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"Murf AI response: {result}")
                
                # Check if the response contains audio data
                if 'audioFile' in result or 'audioUrl' in result or 'audio_url' in result or 'url' in result:
                    print("Audio URL found in response")
                    if 'audioFile' in result:
                        print(f"Audio file URL: {result['audioFile']}")
                else:
                    print("No audio URL found in response. Available keys:", list(result.keys()))
                    
                return result
            except Exception as json_error:
                print(f"Error parsing JSON response: {json_error}")
                print(f"Raw response text: {response.text}")
                return None
        else:
            print(f"Murf AI error: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print("Murf AI request timed out after 30 seconds")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error converting to speech: {e}")
        import traceback
        traceback.print_exc()
        return None

@app.route('/summarize', methods=['POST'])
def summarize_email():
    try:
        data = request.get_json()
        
        if not data or 'email_content' not in data:
            return jsonify({'error': 'Email content is required'}), 400
        
        email_content = data['email_content']
        
        # Create a prompt for email summarization
        prompt = f"""
        Please provide a conversational summary of the following email that would sound natural when read aloud. Write it as if you're an AI assistant directly informing the user about their current situation based ONLY on this specific email. Use direct, helpful language like "You have..." or "You've received..." rather than "The email says..." or "Rohan got an email...". Include specific details like names, amounts, dates, and numbers in a natural way. Make it sound like a helpful assistant speaking directly to the user. IMPORTANT: Only summarize the content of this specific email - do not reference or include information from any previous emails or context. Do NOT start with phrases like "Here's a conversational summary:" or "Here's what the email says:" - just start directly with the information.
        
        Focus on highlighting what's most important for the user to know - prioritize urgent actions, deadlines, amounts, key names, and critical information. Make the most important details stand out naturally in the conversation flow.
        
        Email content:
        {email_content}
        
        Write a conversational summary in 2-3 sentences that sounds like an AI assistant directly informing the user about their current situation based ONLY on this email. Start directly with the information, no introductory phrases. Highlight the most important details that the user needs to know.
        """
        
        # Prepare the request to Groq API
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama3-8b-8192",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 200
        }
        
        # Make the API request
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            summary = result['choices'][0]['message']['content'].strip()
            
            # Get voice ID from request or use default
            voice_id = data.get('voice_id', 'en-US-natalie')
            
            # Convert summary to speech using Murf AI
            speech_result = convert_to_speech(summary, voice_id)
            
            return jsonify({
                'success': True,
                'summary': summary,
                'model_used': 'llama3-8b-8192',
                'speech': speech_result,
                'voice_used': voice_id
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Groq API error: {response.status_code} - {response.text}'
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy', 
        'service': 'email-summarizer',
        'murf_configured': bool(MURF_API_KEY),
        'murf_api_key_length': len(MURF_API_KEY) if MURF_API_KEY else 0,
        'murf_api_url': MURF_API_URL
    })

@app.route('/voices', methods=['GET'])
def get_voices():
    """Get available Murf AI voices"""
    try:
        headers = {
            "api-key": MURF_API_KEY
        }
        
        response = requests.get("https://api.murf.ai/v1/speech/voices", headers=headers, timeout=30)
        
        if response.status_code == 200:
            voices = response.json()
            print(f"Retrieved {len(voices)} voices from Murf AI")
            return jsonify({
                'success': True,
                'voices': voices
            })
        else:
            print(f"Failed to get voices: {response.status_code} - {response.text}")
            return jsonify({
                'success': False,
                'error': f'Failed to get voices: {response.status_code}'
            }), 500
            
    except Exception as e:
        print(f"Error getting voices: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))  # Changed default port to 5001
    app.run(host='0.0.0.0', port=port, debug=True) 