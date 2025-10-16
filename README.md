# 🎓 Study Focus Assistant - BostonHacks2025

A powerful Chrome extension that helps students stay focused during study sessions with AI-powered assistance, distraction management, and Pomodoro timer functionality.(We created the frontend. Did not use a pre-built template out there)
## ✨ Features

### 📚 Study Teacher (Professor StudyBot)
- **AI-Powered Learning Assistant**: Integrated Gemini AI configured as "Professor StudyBot"
- **Socratic Method Teaching**: Guides students to solutions rather than giving direct answers
- **Subject-Specific Approaches**: Tailored teaching for Math/Science, Literature, History, Programming, and Study Skills
- **Session Context Tracking**: Remembers previous questions in study sessions
- **Encouraging Feedback**: Dynamic encouraging phrases and progress recognition
<img src='https://github.com/asmeulders/BostonHacks2025/blob/main/readmeGif/AI_Assisstant.gif' />

### ⏰ Pomodoro Timer System
- **Work/Break Session Management**: Customizable work and break durations
- **Persistent Timer State**: Continues running even if extension is closed
- **Session Completion Notifications**: Visual completion pages with session summaries
- **Background Processing**: Service worker maintains timer state
<img src='https://github.com/asmeulders/BostonHacks2025/blob/main/readmeGif/timer.gif' />

### 🚫 Distraction Management
- **Smart Domain Detection**: Automatically identifies work-related domains
- **Distraction Alerts**: Warns users when visiting non-work sites during work sessions
- **Work Domain Persistence**: Remembers designated work sites across sessions
- **Tab Monitoring**: Real-time tracking of active tabs during study sessions
<img src='https://github.com/asmeulders/BostonHacks2025/blob/main/readmeGif/domain_editor.gif' />

### 🛠️ Other function - Task Manager
<img src='https://github.com/asmeulders/BostonHacks2025/blob/main/readmeGif/task_manager.gif' />

### 🖥️ Retro User Interface
- **Clean Retro Design**: Bold borders, block shadows, and high contrast colors
- **RainyHearts Font**: Custom typography throughout the interface
- **No Fancy Effects**: Simple, distraction-free design with minimal animations
- **Responsive Layout**: Optimized for Chrome extension popup format

## 🚀 Installation

1. **Download/Clone** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top right)
4. **Click "Load unpacked"** and select the project folder
5. **Configure Gemini API** (see API Setup below)

## 🔑 API Setup

### Gemini AI Configuration
1. **Get API Key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Add to Config**: Update `config.json` with your API key:
   ```json
   {
     "geminiApiKey": "YOUR_API_KEY_HERE"
   }
   ```
3. **Reload Extension**: Refresh the extension in Chrome

The extension automatically loads the API key from `config.json` and stores it securely in Chrome storage.

## 📖 Usage Guide

### 🎯 Starting a Study Session
1. **Click Extension Icon** in Chrome toolbar
2. **Select Study Session** (yellow icon)
3. **Start Work Timer** (25 minutes default)
4. **Focus on designated work sites** - first site visited becomes "work domain"
5. **Get distraction alerts** if you navigate to non-work sites

### 🤖 Using Study Chat
1. **Open Study Chat** (Gemini icon)
2. **Ask study-related questions**:
   - "Explain photosynthesis"
   - "Help me understand quadratic equations"
   - "What caused World War I?"
   - "How do for loops work in Python?"
3. **Receive guided explanations** with follow-up questions
4. **Build on previous questions** in the same session

### 🌐 Domain Management
1. **Access Domain Manager** (key icon)
2. **View current tab information**
3. **Add/remove work domains**
4. **Configure allowed sites** for study sessions

### 📝 Google Search Integration
1. **Use search bar** in main popup
2. **Quick access** to Google search
3. **Maintains focus** within study workflow

## 🛠️ Technical Architecture

### Core Components
- **Service Worker**: `service-worker.js` - Background processing, timer management, AI integration
- **Popup Interface**: `popup/` - Main user interface and navigation
- **Content Scripts**: `distraction-alert/` - Tab monitoring and distraction detection
- **AI Integration**: Inline Gemini API implementation with Professor StudyBot persona

### File Structure
```
├── popup/
│   ├── popup.html          # Main interface
│   ├── popup.css           # Retro styling
│   ├── pages/              # Individual feature pages
│   ├── styles/             # Component stylesheets
│   └── js/                 # Frontend JavaScript
├── distraction-alert/      # Content script system
├── fonts/                  # RainyHearts custom font
├── icons/                  # Interface icons
├── config.json            # API configuration
├── manifest.json          # Extension manifest
└── service-worker.js       # Background processing
```

### Key Technologies
- **Chrome Extensions API** (Manifest v3)
- **Google Gemini AI** (generativelanguage.googleapis.com)
- **Chrome Storage API** for persistence
- **Chrome Alarms API** for timer functionality
- **Chrome Tabs API** for distraction detection

## 🎨 Design Philosophy

### Retro Aesthetic
- **Bold Borders**: 2-3px solid borders throughout
- **Block Shadows**: Hard `2px 2px 0px` shadows instead of soft gradients
- **High Contrast**: Clear color separation for accessibility
- **Minimal Animations**: Simple hover effects without complex transitions
- **Monospace Typography**: Technical, computer-like appearance

### Color Palette
- **Primary Orange**: `#ff6b35` (action buttons)
- **Deep Blue**: `#004e89` (headers, accents)
- **Forest Green**: `#2c5530` (success states)
- **Bright Yellow**: `#f5d216` (warnings)
- **Cream Background**: `#f7f3e9` (main background)

## 🤖 Professor StudyBot Features

### Teaching Methodology
- **Step-by-Step Explanations**: Breaks down complex concepts
- **Real-World Applications**: Connects theory to practical examples
- **Guiding Questions**: Uses Socratic method to promote critical thinking
- **Subject Adaptation**: Adjusts approach based on academic discipline

### Response Structure
1. **Encouraging Acknowledgment**: Random motivational greeting
2. **Concept Teaching**: Clear, structured explanation
3. **Practical Example**: Relatable analogy or application
4. **Engagement Question**: Follow-up to deepen understanding
5. **Progress Recognition**: Celebrates learning milestones

### Session Intelligence
- **Question Tracking**: Counts questions asked in current session
- **Subject Recognition**: Identifies and tracks topics covered
- **Context Awareness**: References previous questions when relevant
- **Learning Continuity**: Maintains educational thread across interactions

## 📊 Study Session Analytics

### Timer Functionality
- **Customizable Durations**: Adjustable work/break periods
- **State Persistence**: Survives browser/extension restarts
- **Completion Tracking**: Records session completions
- **Background Monitoring**: Continues timing in background

### Distraction Detection
- **Automatic Domain Learning**: Identifies work sites from first visit
- **Real-time Monitoring**: Tracks tab switches during work sessions
- **Alert System**: Non-intrusive warnings for off-task browsing
- **Domain Management**: Manual override and configuration options

## 🔧 Development

### Setup
```bash
git clone [repository]
cd BostonHacks2025
# Load as unpacked extension in Chrome
```

### Key Files to Modify
- **Service Worker**: `service-worker.js` - Background logic
- **UI Styles**: `popup/styles/main.css` - Global styling
- **AI Prompts**: `service-worker.js` (buildTeacherPrompt function)
- **Configuration**: `config.json` - API keys and settings

### Extension Permissions
- **tabs**: Tab monitoring for distraction detection
- **storage**: Persistent timer and configuration storage
- **scripting**: Content script injection for alerts
- **alarms**: Background timer functionality
- **activeTab**: Current tab information access

## 🚦 Troubleshooting

### Common Issues
1. **Gemini Not Responding**: Check API key in `config.json`
2. **Timer Not Persisting**: Verify Chrome storage permissions
3. **Distraction Alerts Missing**: Check content script permissions
4. **Styling Issues**: Clear Chrome cache and reload extension

### Debug Console
- **Extension Popup**: Right-click popup → "Inspect"
- **Service Worker**: Chrome Extensions page → "Service Worker" link
- **Content Scripts**: F12 on any webpage → Console tab

## 🎯 Future Enhancements

### Potential Features
- **Study Analytics**: Session statistics and productivity metrics
- **Custom Study Plans**: Personalized learning schedules
- **Collaborative Sessions**: Multi-user study rooms
- **Advanced AI**: Subject-specific AI tutors
- **Mobile Companion**: Smartphone app integration

### Technical Improvements
- **Offline Support**: Local AI model integration
- **Enhanced Analytics**: Detailed productivity tracking
- **Custom Themes**: User-configurable color schemes
- **Plugin System**: Modular feature architecture

## 📄 License

This project is developed for BostonHacks2025 hackathon.

## 🙏 Acknowledgments

- **Google Gemini AI** for intelligent tutoring capabilities
- **Chrome Extensions API** for platform foundation
- **BostonHacks2025** for hackathon opportunity
- **RainyHearts Font** for retro typography

---

**Built with ❤️ for students who want to stay focused and learn effectively!** 🎓✨
