# AGENTS Guidelines for This Repository

This repository contains an Angular 18 frontend application for a PFE project (Projet de Fin d’Études (PFE) qui consiste à développer une application web de gestion de la production pour une huilerie.
L’objectif principal du système est de digitaliser et optimiser le processus de production, collecter les données de production et les exploiter ultérieurement pour développer un modèle d’intelligence artificielle capable de prédire le rendement et la qualité de la production.

Le périmètre du projet est limité uniquement à la gestion de la production dans l’huilerie.).  
When working on the project interactively with an agent (e.g., VS Code AI agent), please follow the guidelines below to ensure clean, stable, and production-level development.

---

## 1. Do Only the Requested Task

Always implement ONLY the exact task explicitly requested.

- Do NOT add extra features.
- Do NOT generate additional components unless explicitly requested.
- Do NOT refactor unrelated code.
- Do NOT introduce speculative improvements.
- Keep implementations simple and clear.

Avoid over-engineering. This is a structured PFE project, not an experimental playground.

---

## 2. Preserve Project Structure

This project follows a clean Angular structure:



   ├── Core
   │      services + guards + interceptors
   │
   ├── Shared
   │      components réutilisables
   │
   └── Features
          pages+ models+ services

         
core Contient ce qui doit exister une seule fois.
shared Contient les éléments réutilisables partout.
features Chaque dossier représente un domaine métier.

Do NOT mix responsibilities between folders.  
Do NOT create new folders unless explicitly instructed.  
Do NOT create a separate CSS or JS file — always use the component's own SCSS file.

---

## 3. Component Protection Rule

Existing components are the foundation of this project.

- NEVER modify, refactor, or restructure an existing component without explicit approval.
- If a component change seems necessary, ask for confirmation before applying it.
- Do NOT adjust existing service calls unless explicitly instructed.
- Do NOT change existing route definitions unless explicitly instructed.

Component stability is mandatory.

---

## 4. Coding Standards

### Angular
- All components → standalone: true
- Always import CommonModule, RouterModule, FormsModule, ReactiveFormsModule where needed
- Use OnPush change detection only when explicitly requested
- Use constructor injection — do NOT use inject() function

### TypeScript Naming Conventions
- Interfaces → PascalCase (e.g. StudentProfile)
- Enums → PascalCase, values → UPPER_CASE
- Variables and methods → camelCase
- Component files → kebab-case (e.g. course-detail.component.ts)

### SCSS Rules
- Always use SCSS, never plain CSS
- Always use CSS variables for colors and theme values
- Support both light and dark themes using :host-context(.dark-theme)
- Never hardcode color values directly in rules — always use CSS variables
- Never use inline styles in templates

### Fonts
- Do NOT use Inter, Roboto, Arial, or system fonts
- Approved fonts: Plus Jakarta Sans, DM Sans, Sora, Fraunces, Playfair Display
- Import from Google Fonts in the component or global styles

---

## 5. Theme Support

This project supports both light and dark themes.

- Light theme is the default
- Dark theme is activated by adding the class dark-theme to the body element
- Every component must define both theme variants using CSS variables
- Never write styles that only work in one theme

---

## 6. Navigation Rules

- Always use Angular Router for navigation — never use window.location.href
- For certificate download links — use window.open(url, '_blank')
- For all other notification actionUrls — use router.navigateByUrl(actionUrl)
- Never use anchor href binding for internal navigation

---

## 7. HTTP and API Rules

- All HTTP calls go through dedicated service files in shared/services/
- Never make HTTP calls directly inside components
- The base API URL is http://localhost:8000

- Always handle errors in service files — never let uncaught HTTP errors reach the component

---

## 8. Notification System Rules

- Mark as read and navigate must happen independently — never block navigation on HTTP response
- CERTIFICATE category → window.open(actionUrl, '_blank')
- All other categories → router.navigateByUrl(actionUrl)
- actionUrl for in-app notifications is always a relative Angular route (e.g. /dashboard/courses/43)
- actionUrl for emails is always a full absolute URL (e.g. http://localhost:4200/dashboard/courses/43)

---

## 9. Output Style Rules

- Return only what is requested
- No unnecessary explanations unless explicitly asked
- No excessive inline comments explaining basic concepts
- Keep responses concise
- Maintain clean formatting
- Always include the full file path as a comment at the top of each returned file

---

## 10. Development Workflow

When modifying frontend code:

- Do not change angular.json or package.json unless requested
- Do not alter existing route guards unless instructed
- Do not generate markdown documentation files unless explicitly requested
- Do not add new npm packages without explicit approval

If unsure, ask before making structural changes.

---

Following these guidelines ensures a clean, organized, and professional PFE frontend project with stable foundations and predictable agent behavior.
