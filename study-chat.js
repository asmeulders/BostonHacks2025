// Simple Study Helper Chat Script
// Usage: node study-chat.js

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Load config
function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        console.error('Error loading config.json. Make sure it exists and has your API key.');
        process.exit(1);
    }
}

class StudyHelper {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    }

    async askQuestion(question) {
        try {
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a helpful work/study assistant. Answer this work/study question clearly and concisely.
                                    If the question seems like a distraction or unrelated to working, steer the user back
                                    to work. Remember to be friendly and helpful but limit your responses to 60 words.: ${question}`
                        }]
                    }]
                })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                return 'Sorry, I couldn\'t generate a response.';
            }
        } catch (error) {
            return `Error: ${error.message}`;
        }
    }
}

// Main chat function
async function startChat() {
    const config = loadConfig();
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const helper = new StudyHelper(config.geminiApiKey);
    
    console.log('\n🤖 Study Helper ready! Ask me anything. Type "quit" to exit.\n');

    // Chat loop
    while (true) {
        const question = await new Promise(resolve => {
            rl.question('You: ', resolve);
        });

        if (question.toLowerCase() === 'quit') {
            console.log('Goodbye!');
            break;
        }

        if (question.trim()) {
            console.log('AI: Thinking...');
            const answer = await helper.askQuestion(question);
            console.log(`AI: ${answer}\n`);
        }
    }

    rl.close();
}

// Run if called directly
if (require.main === module) {
    startChat().catch(console.error);
}

module.exports = StudyHelper;