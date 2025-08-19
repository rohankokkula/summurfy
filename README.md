# Summurfy: AI Email Reader

A comprehensive tutorial for developers to build a Chrome extension that reads Gmail emails, summarizes them using AI, and converts summaries to speech. 





## 🎯 What We're Building

A Chrome extension that:
1. **Reads Gmail emails** - Extracts subject, sender, and body content
2. **AI Summarization** - Uses Groq's Llama3-8b model for intelligent summaries
3. **Text-to-Speech** - Converts summaries to audio using Murf AI
4. **User Experience** - Provides a clean interface for email processing



## A. Setting up the flask server

### Step 1: Clone & Setup Python Environment

```bash
# Clone the repository
git clone https://github.com/rohankokkula/summurfy.git
cd summurfy
```

### Step 2: Set up Python backend

```bash
cd backend
pip install -r requirements.txt
```

### Step 3: Getting the environment variables

- GROQ_API_KEY: https://console.groq.com/keys
- MURF_API_KEY: https://murf.ai/api/api-keys

```
python server.py
```
✅ Server will start on port **5001**

## B. Loading the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `extension/` folder from this repository
4. You'll see the "murfy" extension loaded

### Step 3: Test the Extension

1. Go to `gmail.com` and open any email
2. Look for the **speaker widget** at the bottom right corner
3. Click the widget to:
   - **Play** the audio summary
   - **Pause** playback
   - **Download** the audio file

That's it! The extension automatically detects when you're viewing an email and provides instant audio summaries.

## 🔧 How It Works (Technical Flow)
![flowchart](/assets/flow.png)

### 1. Email Detection & Extraction
When you open a Gmail email, the extension automatically:
- Detects the email view using DOM selectors
- Extracts subject, sender, and body content
- Creates a floating widget interface

### 2. AI Processing Pipeline
```
Email Content → Flask Server → Groq API → Summary → Murf AI → Audio
```

**Key Functions:**
- `extractEmailData()` - Reads Gmail DOM and extracts email content
- `summarize_email()` - Flask endpoint that processes the email through Groq API
- `convert_to_speech()` - Converts summary text to audio using Murf AI

### 3. Audio Delivery
- Audio is generated and returned as a downloadable URL
- User can play directly in the extension or download the file

## 📋 Function Reference

### Backend Functions (Python/Flask)

| Function | Purpose |
|----------|---------|
| `summarize_email()` | Main endpoint for email summarization |
| `convert_to_speech()` | Converts text to audio using Murf AI |
| `health_check()` | Backend health monitoring |
| `get_voices()` | Retrieves available Murf AI voices |

### Extension Functions (JavaScript)

| Function | Purpose |
|----------|---------|
| `GmailReader.init()` | Initializes the extension |
| `extractEmailData()` | Extracts email content from Gmail DOM |
| `getSubject()` | Gets email subject line |
| `getSender()` | Extracts sender information |
| `getBody()` | Retrieves email body content |
| `createWidget()` | Creates the UI widget |
| `handleSummarize()` | Processes summarization requests |

## 🧠 Thought Process & Design Philosophy

### **Core Philosophy: Utility Over App**
I wanted this extension to feel like a **utility** (like a calculator) rather than a full application. The goal was maximum intuitiveness with minimal cognitive load.

**Design Principles:**
- **Super intuitive**: Just open an email and it reads it aloud
- **Direct UI**: No unnecessary buttons or complex interfaces
- **Less noise**: Clean, focused interface that doesn't distract from Gmail
- **Seamless integration**: Feels like a native Gmail feature

### **Technical Implementation Logic**

#### **Phase 1: Email Extraction**
- Started with fetching email body from the opened Gmail URL
- Used DOM selectors to extract subject, sender, and content
- Focused on reliability - handling different Gmail layouts and content types

#### **Phase 2: AI Processing**
- **Flask Server**: Acts as middleware between extension and external APIs
- **Groq API**: Chose Llama3-8b for fast, reliable summarization
- **Murf AI**: High-quality text-to-speech with natural voice output

#### **Phase 3: Audio Delivery**
- **Challenge**: Downloading audio without opening new tabs
- **Solution**: Direct audio URL generation with download capability
- **Result**: Seamless audio experience within the extension

## 🚨 Challenges & Solutions

### **Technical Challenges Faced**

1. **Audio Download Without New Tabs**
   - **Problem**: Chrome extensions can't easily download files without user interaction
   - **Solution**: Generate direct download URLs and let users click to download
   - **Future**: Could implement database storage for offline access

2. **Image-Only Emails**
   - **Problem**: Some emails contain only images, no text to summarize
   - **Current**: Extension skips these emails
   - **Future**: Add image processing (OCR) to extract text from images

3. **Gmail DOM Changes**
   - **Problem**: Gmail updates can break DOM selectors
   - **Solution**: Multiple fallback selectors and robust error handling
   - **Future**: Implement dynamic selector detection

## 🚀 Future Scope & Scaling

### **Immediate Enhancements**
- **Cross-Platform Support**: Extend to Outlook, Yahoo, and other email services
- **Bulk Processing**: Daily email summaries for multiple emails
- **Advanced AI Models**: Larger context windows for better summarization

### **Advanced Features**
- **Bulk Summarization**: End-of-day summaries of all emails
- **Context-Aware Processing**: Understand email threads and conversations
- **Multi-Language Support**: Process emails in different languages
- **Voice Customization**: Multiple voice options and accents

### **Enterprise Applications**
- **Team Collaboration**: Shared email summaries and insights
- **Integration**: Connect with Slack, Teams, CRM systems
- **Analytics**: Track email patterns and productivity metrics
- **API Marketplace**: Allow third-party integrations

## 🔗 API Choices Justification

### **Why Groq API?**
- **Speed**: Llama3-8b model provides fast inference (essential for real-time use)
- **Cost**: Free
- **Reliability**: Stable API with good uptime
- **Model Quality**: Llama3-8b offers excellent summarization capabilities

### **Why Murf AI?**
- **Voice Quality**: Natural-sounding speech synthesis
- **Multiple Voices**: Various accents and languages available
- **Format Options**: Multiple audio formats (WAV, MP3)
- **API Reliability**: Consistent performance and good documentation

## 🐛 Common Issues & Debugging

| Issue | Solution |
|-------|----------|
| Extension not loading | Check manifest.json syntax and reload |
| Server connection failed | Verify Flask server is running on port 5001 |
| API errors | Check .env file for valid API keys |
| Email not detected | Refresh Gmail page and try again |
| Audio not playing | Check browser console for errors |

## 📋 Requirements

- Python 3.7+
- Chrome browser with developer mode
- Groq API key (free tier available)
- Murf AI API key
- Local development environment


---

**The beauty of this approach is its simplicity. It's not trying to be everything - it's focused on doing one thing really well: making emails audible. This focused approach makes it easy to extend and improve over time.**
