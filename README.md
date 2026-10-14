# Reps — AI Pushup Counter & Squad Fitness Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth-ffca28.svg)](https://firebase.google.com/)
[![MediaPipe](https://img.shields.io/badge/Vision-Google%20MediaPipe-00bcd4.svg)](https://developers.google.com/mediapipe)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20PWA%20%7C%20Google%20Play-success.svg)](https://play.google.com)

> **Live Production App:** [Launch Reps Web App](https://ais-pre-vmm4vtwn776gejugukhniq-81540067927.europe-west2.run.app)  
> **Google Play Store:** Coming Soon to Google Play *(Package: `com.reps.pushupcounter`)*

---

## 📌 Executive Summary

**Reps** is a high-performance, mobile-first fitness application that turns any smartphone or laptop camera into an intelligent, hands-free pushup coach. Using on-device computer vision and real-time multiplayer synchronization, Reps delivers accurate repetition counting, form verification, live squad leaderboards, and gamified accountability mechanics.

Built as a commercial-grade Progressive Web App (PWA) packaged for Google Play and the Apple App Store, Reps demonstrates end-to-end full-stack software engineering, real-time client-side machine learning, and monetization system design.

---

## 🚀 Key Features

### 1. Hands-Free AI Computer Vision Tracking
- **100% On-Device Inference:** Video streams are analyzed frame-by-frame on the client using Google MediaPipe Pose models. Zero camera footage leaves the athlete's device.
- **Biomechanical Angle Trigonometry:** Tracks the 3D coordinates of shoulders, elbows, and wrists to calculate joint angles in real time.
- **State Machine Debouncing & Form Validation:** Employs hysteresis thresholds (inflection depth vs. full arm extension lockout) to eliminate false counts and reward strict pushup form.
- **Real-Time HUD & Audio Feedback:** Features a high-visibility workout HUD with milestone speech synthesis and custom Web Audio API sound cues.

### 2. Workout Squad & Gamified Accountability
- **Live Squad Line Sync:** Instant multi-user line synchronization powered by Firestore real-time snapshots.
- **Swipe-to-Remove Gestures:** Custom touch and pointer-tracked gesture physics allowing athletes to slide squad member cards left to remove them, complete with spring animation, haptic threshold cues, and instant Undo toasts.
- **"Squad Spanking" Engine:** An interactive accountability mechanic where athletes can wake up squad members who missed workouts within 24 hours, triggering synthesized sound effects and web notifications.

### 3. Cumulative Progression Analytics
- **Dynamic Charting:** Interactive multi-athlete comparison curves built with Recharts across 30-day, 90-day, 1-year, and "First Day" cohorts.
- **Progressive Cumulative Totals:** Intelligently aggregates daily reps into running cumulative curves, allowing athletes to see visual divergence against their squad.

### 4. 4 High-Octane Visual Themes & Glassmorphism
- **Dynamic Themes:** Includes **Night** (minimalist neon), **Aurora** (cyberpunk northern lights), **Inferno** (molten energy), and **Holopop** (candy gloss light mode).
- **GPU-Accelerated Moving Backgrounds:** Interactive particle canvas engines and dynamic gradient shaders.
- **60% Translucent Frosted Glass:** Utilizes `backdrop-blur` and alpha compositing to allow animations to glide beneath data blocks while preserving contrast and legibility.

### 5. Production Monetization & Store Compliance
- **Reps PRO Subscription:** In-app paywall offering a **5-day free trial** and **$15.99/year** ($1.33/month) or $2.99/month pricing.
- **App Store & Google Play Policy Compliance:** Integrated **Restore Purchases** system, in-app **Privacy Policy**, and **Terms of Service** modals.
- **Freemium Ad Architecture:** Non-intrusive sponsor cards for free users that automatically collapse once a user upgrades to PRO.

---

## 🛠️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                       REPS CLIENT                           │
│  React 19  •  TypeScript  •  Tailwind CSS v4  •  Recharts  │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
    Client-Side Vision                Real-Time Cloud State
                │                             │
┌───────────────▼─────────────┐ ┌─────────────▼───────────────┐
│     Google MediaPipe Pose   │ │   Firebase Cloud Firestore  │
│  • 33 3D Pose Landmarks     │ │  • Real-time Snapshot Sync  │
│  • Trigonometric Joint Math │ │  • Firebase Authentication  │
│  • Lockout Hysteresis Engine│ │  • Role & Document Security │
└─────────────────────────────┘ └─────────────────────────────┘
                │                             │
┌───────────────▼─────────────────────────────▼───────────────┐
│                    MOBILE PACKAGING & PWA                   │
│  Vite PWA (Service Workers) • Trusted Web Activity (TWA)     │
│  Ready for Google Play Store (.aab) & Apple App Store       │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend Framework** | React 19 (Hooks, Context Architecture, Concurrent Features) |
| **Language & Tooling** | TypeScript 5.x, Vite, Node.js |
| **Styling & Design System**| Tailwind CSS v4, Glassmorphism, CSS Custom Properties |
| **Computer Vision / AI** | Google MediaPipe Pose, WebRTC MediaStream API |
| **Audio Processing** | Web Audio API (Synthesized butt-slap transient sound design) |
| **Backend & Persistence** | Firebase Firestore (Real-time snapshots), Firebase Auth |
| **Charts & Visualization** | Recharts (ComposedChart, Custom SVG Tooltips, Cumulative Series) |
| **Mobile Deployment** | Vite PWA, Web App Manifest, Service Worker Caching, Bubblewrap/TWA |

---

## 🧠 Technical Highlights & Engineering Decisions

### 1. Eliminating Latency with 100% Client-Side Machine Learning
Sending video frames to a remote server for ML inference introduces 200–500ms network latency and massive cloud bandwidth costs. Reps runs Google MediaPipe Pose inference directly within the browser runtime using WebGL/WebGPU acceleration, achieving smooth 60 FPS pose tracking with zero bandwidth overhead and absolute user privacy.

### 2. Trigonometric Form Detection Algorithm
Rather than relying on basic bounding-box movement, Reps computes vector angles between the shoulder $(x_1, y_1)$, elbow $(x_2, y_2)$, and wrist $(x_3, y_3)$:

$$\theta = \arccos\left(\frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}\right)$$

A repetition is only scored when:
1. The joint angle dips below the flexion inflection threshold ($< 90^\circ$).
2. The user returns to full extension lockout ($> 160^\circ$).
3. The body alignment slope (shoulder to hip) remains within horizontal plank tolerances.

### 3. Touch & Mouse Gesture Physics (Swipe-to-Remove)
To provide a native iOS/Android feel on the web, squad member cards implement touch and mouse pointer event tracking:
- Detects horizontal vs. vertical intention during the first 6px of motion to prevent blocking vertical scroll.
- Applies logarithmic resistance when pulling right or past maximum bounds.
- Triggers dynamic threshold feedback ("Release to Remove") and a 300ms exit transition with instant Undo capability.

---

## 📦 Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/reps-ai-pushup.git
   cd reps-ai-pushup
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and provide your Firebase project keys:
   ```bash
   cp .env.example .env
   ```

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 📱 Google Play & App Store Packaging

This app is configured for store distribution using **Trusted Web Activity (TWA)** and **Capacitor**:
- **Android (.aab):** Packaged via `@bubblewrap/cli` or Capacitor Android.
- **iOS:** Built via Xcode with `@capacitor/ios`.
- Comprehensive deployment instructions are documented in `STORE_LAUNCH_GUIDE.md`.

---

## 📄 License & Intellectual Property

Proprietary software. Developed and engineered by **Nicolas Merlivat** for portfolio demonstration and commercial distribution. All rights reserved.
