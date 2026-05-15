---
title: "CallSentry"
seo_title: "CallSentry | Native Android Security Engineering — Kotlin & Jetpack Compose"
description: "A native Kotlin Android security application engineered with Jetpack Compose, Room Database, MVVM architecture, and system-level Broadcast Receivers for proactive call privacy and emergency breakthrough."
excerpt: "A native Android security application engineered for proactive privacy and emergency call breakthrough."
collection: portfolio
---

**Summary:** A system-level Android application that balances strict communication privacy with reliable emergency contact routing.

*   **Problem:** Existing call blockers either let spam through or rigidly block everything, lacking fine-grained control to ensure critical emergency calls can bypass filters safely.
*   **Solution:** Built a native Android application using Kotlin to provide offline, privacy-first call and SMS filtering. Architected a custom background service using Broadcast Receivers and system-level permissions to intercept and evaluate incoming calls. It checks numbers against a secure local whitelist-based blocking architecture to enforce privacy controls while guaranteeing emergency contacts are routed immediately.
*   **Tech Stack:** Kotlin, Jetpack Compose, MVVM Architecture, Room Database, Android Telephony System APIs, Broadcast Receivers.
*   **Outcome:** Executed rapid prototyping to deliver a stable, production-ready application within a highly constrained **3-day development lifecycle**. Achieved robust, low-latency call interception without draining battery life or blocking the main UI thread.

### System Architecture

```mermaid
flowchart TD
    A["📞 Incoming Call"] --> B["BroadcastReceiver\n(TelephonyManager)"]
    B --> C{"Number in\nWhitelist?"}
    C -->|Yes| D["✅ Allow Call\n(Emergency/VIP)"]
    C -->|No| E{"Number in\nBlocklist?"}
    E -->|Yes| F["🚫 Reject Call\n(endCall API)"]
    E -->|No| G{"Default\nPolicy?"}
    G -->|Block Unknown| F
    G -->|Allow Unknown| D
    
    subgraph "Data Layer (Room DB)"
        H["ContactsDAO"]
        I["BlocklistDAO"]
        J["WhitelistDAO"]
    end

    subgraph "UI Layer (Jetpack Compose)"
        K["SettingsScreen"]
        L["CallLogScreen"]
        M["ContactManagerScreen"]
    end

    subgraph "ViewModel (MVVM)"
        N["CallInterceptorVM"]
    end

    K --> N
    L --> N
    M --> N
    N --> H
    N --> I
    N --> J
    B --> J
    B --> I
```

*   **What I learned:** Deepened my understanding of Android system-level APIs, managed complex background service lifecycles securely, and implemented strict MVVM separation for asynchronous data flows.