# Quest: The Self-Evolving Game 

Welcome to **Quest**, a recursively self-improving digital ecosystem where gaming meets the power of the Gemini CLI. Quest isn't just a game you play; it's an interface that learns and expands as you interact with it.

---

## 🐍 The Concept
Quest provides a **cute, aesthetic interface** for the Gemini CLI. Every command you run contributes to the "evolution" of the game environment. 
* **Recursive Growth:** The code can suggest improvements to its own UI.
* **AI Integration:** Deeply integrated with Gemini for dynamic storytelling and logic.
* **Cute Aesthetics:** Because terminal tools don't have to be boring.

---

## 🏘️ How to Run Quest

Follow these steps to enter the digital realm:

### 1. Prerequisites
Before starting your journey, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Gemini CLI](https://ai.google.dev/gemini-api/docs/quickstart) configured on your machine.
* An active **Google AI API Key**.

### 2. Installation
Clone the repository and install the dependencies:
```bash
git clone [https://github.com/dangerceo/quest.git](https://github.com/dangerceo/quest.git)
cd quest
npm install

```

### 3. Initialize the Connection

Quest needs to "talk" to Gemini. Link your CLI by running:

```bash
gemini auth login

```

### 4. Start the Engine

Launch the cute interface:

```bash
npm run dev

```

Open your browser to `http://localhost:5173` and watch the magic happen! ✨

---

## 🛠️ Commands inside Quest

While inside the interface, you can use specialized commands that the game translates for the Gemini CLI:

| Command | Action |
| --- | --- |
| `/evolve` | Asks Gemini to suggest a new UI component or feature. |
| `/think` | Initiates a reasoning chain for complex game logic. |
| `/recode` | Applies recursive improvements to the current project files. |
| `/status` | Shows your current "Evolution Level." |

---

## 🎨 Interface Preview

The game uses a [React + Vite](https://vite.dev/) stack with a soft, vaporware-inspired aesthetic. It features:

* **Glassmorphism** panels.
* **Animated Transitions** between CLI outputs.
* **Recursive Terminal** for direct LLM interaction.

---

## 🍬 Contributing

Want to help Quest grow faster?

1. Fork the repo.
2. Create a branch (`git checkout -b feature/NewMagic`).
3. Commit your changes.
4. Open a Pull Request!

**Let's build something that builds itself!** 🤖💕
