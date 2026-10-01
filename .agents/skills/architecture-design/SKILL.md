---
name: architecture-design
description: Design software architecture from approved requirements while preserving traceability and documenting architectural decisions.
---

# Architecture Design Skill

## Objective

Transform approved software requirements into a coherent software architecture.

## Inputs

Read:

- docs/requirements.md
- docs/user-stories.md
- docs/acceptance-criteria.md
- docs/requirements-approval.md

Only use approved requirements.

## Process

1. Identify architectural style.
2. Identify major components.
3. Define responsibility of each component.
4. Define dependencies.
5. Define communication between components.
6. Define data flow.
7. Identify external systems.
8. Identify security boundaries.
9. Document architectural decisions.
10. Check requirements-to-architecture traceability.

## Rules

- Do not implement source code.
- Do not modify approved requirements.
- Do not introduce unnecessary technologies.
- Every major architectural decision must have a rationale.
- Preserve traceability to approved requirements.
- Clearly identify external systems and trust boundaries.
- Do not invent functionality that is not present in approved requirements.

## Outputs

Create or update:

- docs/architecture.md
- docs/architecture-decisions.md

## Verification

Before completing the task verify:

- every major functional requirement is supported by at least one architectural component;
- every major non-functional requirement is addressed;
- AI architecture supports the approved RAG flow;
- security boundaries are documented;
- external dependencies are identified;
- no approved requirement was changed.