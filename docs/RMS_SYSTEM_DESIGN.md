# RESTAURANT MANAGEMENT SYSTEM (RMS)
## Complete System Design Document

**Project Type**: Undergraduate Capstone Project
**Version**: 1.0
**Date**: July 2026
**Status**: Design Complete — Pending Backend Development Approval

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Objectives](#2-objectives)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-functional Requirements](#4-non-functional-requirements)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Complete Module Breakdown](#6-complete-module-breakdown)
7. [Detailed Feature List](#7-detailed-feature-list)
8. [Business Process Flow](#8-business-process-flow)
9. [Restaurant Workflow](#9-restaurant-workflow)
10. [Integration Workflow](#10-integration-workflow)
11. [Database Planning](#11-database-planning)
12. [PostgreSQL Table List](#12-postgresql-table-list)
13. [Entity Relationship Diagram (ERD)](#13-entity-relationship-diagram-erd)
14. [Database Relationships](#14-database-relationships)
15. [API Architecture](#15-api-architecture)
16. [Project Structure & Folder Organization](#16-project-structure--folder-organization)
17. [System Architecture Diagram](#17-system-architecture-diagram)
18. [Sequence Diagram](#18-sequence-diagram)
19. [Data Flow Diagram](#19-data-flow-diagram)
20. [Use Case Diagram](#20-use-case-diagram)
21. [Integration Diagram](#21-integration-diagram)
22. [Security Architecture](#22-security-architecture)
23. [Deployment & Domain Planning](#23-deployment--domain-planning)
24. [Module Integration Guidelines](#24-module-integration-guidelines)
25. [Development Roadmap](#25-development-roadmap)
26. [Testing Strategy](#26-testing-strategy)
27. [Documentation Plan](#27-documentation-plan)

---

## 1. SYSTEM OVERVIEW

The Restaurant Management System (RMS) is a comprehensive module designed to manage all aspects of restaurant operations. It is developed as part of an **undergraduate Capstone Project** and serves as one module within a larger integrated system. Each capstone team develops its assigned module independently, and all modules are later integrated by the Lead Programmer into a single unified system.

Our assigned module is the **Restaurant Management System**, which handles customer seating, menu configuration, order processing, kitchen coordination, point-of-sale transactions, inventory tracking, staff scheduling, and business analytics.

The system is built on a **modular architecture** using **Laravel (PHP)** for the backend API, **Next.js (React/TypeScript)** for the frontend, and **PostgreSQL** as the primary relational database. It employs **Redis** for caching and real-time pub/sub, **WebSockets** for live kitchen order updates, and a **RESTful API** layer.

**Project Objectives:**
- Develop a fully functional Restaurant Management System demonstrating software engineering best practices
- Remain realistic for a student development team (4–6 members)
- Produce a system that is modular, maintainable, easy to integrate, and scalable for future improvements
- Meet academic evaluation requirements while being ready for production demonstration

**Key Features:**
- Real-time kitchen order ticket (KOT) management with printer integration
- Integration hooks with other capstone modules (HRMS, Finance, Supply Chain, Hotel, Facilities)
- Role-based access control (RBAC) with granular permissions
- Audit logging for compliance and accountability
- Deployment-ready for demonstration with a custom domain

---

## 2. OBJECTIVES

| # | Objective | Priority |
|---|-----------|----------|
| O1 | Streamline end-to-end restaurant operations from order to payment | High |
| O2 | Provide real-time visibility into restaurant performance via dashboards | High |
| O3 | Enable seamless multi-outlet management from a centralized system | High |
| O4 | Ensure integration readiness with ERP modules (HRMS, Finance, SCM, Hotel, Facilities) | High |
| O5 | Reduce food wastage through inventory tracking and consumption analytics | Medium |
| O6 | Improve table turnover through efficient reservation and seating management | High |
| O7 | Deliver role-based access control with audit trail compliance | High |
| O8 | Support offline POS operations with eventual consistency sync | Medium |
| O9 | Enable data-driven decision-making through analytics and reporting | Medium |
| O10 | Achieve 99.9% uptime during peak operational hours | High |
| O11 | Support multi-currency and multi-language for international deployments | Medium |
| O12 | Provide mobile-responsive interfaces for floor managers and servers | High |

---

## 3. FUNCTIONAL REQUIREMENTS

### FR-01: Dashboard
- FR-01.1: Real-time revenue summary (daily, weekly, monthly, yearly)
- FR-01.2: Active orders count and status breakdown
- FR-01.3: Table occupancy heatmap
- FR-01.4: Top-selling menu items and trending categories
- FR-01.5: Peak hours visualization
- FR-01.6: Staff on-duty status
- FR-01.7: Quick alerts for low inventory items
- FR-01.8: Customer feedback summary

### FR-02: Customer & Table Management
- FR-02.1: Customer registration and profile management (walk-in, registered, VIP)
- FR-02.2: Table creation with floor plan layout (configurable zones, sections)
- FR-02.3: Table status tracking (available, reserved, occupied, needs-cleaning, maintenance)
- FR-02.4: Table capacity configuration (seating count, wheelchair accessible)
- FR-02.5: Table merging and splitting for group orders
- FR-02.6: Reservation scheduling (walk-in, phone, online)
- FR-02.7: Waitlist management with estimated wait time
- FR-02.8: Customer order history and preferences
- FR-02.9: Customer loyalty points tracking
- FR-02.10: Table transfer (move order between tables)

### FR-03: Menu Management
- FR-03.1: Menu category and sub-category management
- FR-03.2: Menu item CRUD with pricing, description, images, allergens
- FR-03.3: Item availability toggle (time-based and manual)
- FR-03.4: Item modifiers and add-ons (size, spice level, extras)
- FR-03.5: Combo/set meal management with auto-pricing
- FR-03.6: Tax configuration per item (food, beverage, service charge)
- FR-03.7: Menu item variants (e.g., half-plate, full-plate)
- FR-03.8: Seasonal/limited-time menu support
- FR-03.9: Multi-language menu items
- FR-03.10: Nutritional information and allergen flags
- FR-03.11: Kitchen display system (KDS) item routing per station

### FR-04: Order Management
- FR-04.1: Order creation (dine-in, takeaway, delivery)
- FR-04.2: Order item addition, modification, and removal before billing
- FR-04.3: Order status lifecycle management (placed → confirmed → preparing → ready → served → completed)
- FR-04.4: Split bill functionality (by item, by seat, custom split)
- FR-04.5: Order hold and recall
- FR-04.6: Quick-order mode for fast-service outlets
- FR-04.7: Delivery order integration (third-party platforms or in-house)
- FR-04.8: Order notes and special instructions
- FR-04.9: Reorder from history
- FR-04.10: Void/cancel order with authorization

### FR-05: Kitchen Order Ticket (KOT)
- FR-05.1: Automatic KOT generation upon order confirmation
- FR-05.2: Station-wise KOT routing (grill, bar, pastry, cold kitchen)
- FR-05.3: Real-time KOT display on Kitchen Display System (KDS)
- FR-05.4: KOT status updates (received → in-progress → ready)
- FR-05.5: Priority flagging and escalation alerts
- FR-05.6: Estimated preparation time tracking
- FR-05.7: Printer integration (thermal/receipt printers)
- FR-05.8: KOT reprint and void with reason code
- FR-05.9: Batch KOT management for large orders

### FR-06: POS & Billing
- FR-06.1: POS terminal interface with quick-item grid
- FR-06.2: Multiple payment methods (cash, card, digital wallet, room charge, corporate account)
- FR-06.3: Split payment across methods
- FR-06.4: Tip management
- FR-06.5: Discount application (item-level, order-level, coupon/promo code)
- FR-06.6: Auto-gratuity for large parties
- FR-06.7: Invoice generation (receipt, tax invoice, pro-forma)
- FR-06.8: Refund processing (full, partial) with authorization
- FR-06.9: End-of-day cash register closeout (Z-report)
- FR-06.10: Offline POS mode with queue sync
- FR-06.11: Multi-currency payment support
- FR-06.12: Room charge integration (post to hotel folio)
- FR-06.13: Gift card and voucher redemption

### FR-07: Inventory Management
- FR-07.1: Ingredient and raw material catalog
- FR-07.2: Recipe-level ingredient mapping with quantity per serving
- FR-07.3: Stock level tracking (current stock, reserved, incoming)
- FR-07.4: Low-stock alerts and reorder notifications
- FR-07.5: Purchase order creation and tracking
- FR-07.6: Supplier management
- FR-07.7: Stock inward/outward logging with audit trail
- FR-07.8: Wastage and expiry tracking
- FR-07.9: Consumption analytics per menu item
- FR-07.10: Multi-location inventory (central store, outlet-specific)
- FR-07.11: FIFO/FEFO stock management
- FR-07.12: Integration with Supply Chain Management module

### FR-08: Staff Management
- FR-08.1: Staff profile management (name, role, shift, contact)
- FR-08.2: Shift scheduling and roster management
- FR-08.3: Clock-in/clock-out with GPS/biometric
- FR-08.4: Staff performance tracking (orders handled, tips earned, ratings)
- FR-08.5: Commission and incentive calculation
- FR-08.6: Role-based POS access per staff member
- FR-08.7: Integration with HRMS module for payroll and attendance
- FR-08.8: Staff assignment to tables/sections
- FR-08.9: Server performance analytics

### FR-09: Administration & Analytics
- FR-09.1: Multi-outlet management from single admin panel
- FR-09.2: System-wide configuration and settings
- FR-09.3: Role and permission management (super admin, admin, manager, etc.)
- FR-09.4: Audit log viewer with search and export
- FR-09.5: Revenue and sales reports (daily, weekly, monthly, custom)
- FR-09.6: Menu performance analytics (best sellers, slow movers, margin analysis)
- FR-09.7: Customer analytics (visit frequency, average spend, retention)
- FR-09.8: Inventory variance reports
- FR-09.9: Staff productivity reports
- FR-09.10: Tax and compliance reports
- FR-09.11: Custom report builder with export (PDF, Excel, CSV)
- FR-09.12: Real-time operational notifications and alerts

---

## 4. NON-FUNCTIONAL REQUIREMENTS

| # | Requirement | Description | Target |
|---|-------------|-------------|--------|
| NFR-01 | **Performance** | API response time under normal load | < 200ms (p95) |
| NFR-02 | **Performance** | POS transaction processing time | < 500ms |
| NFR-03 | **Performance** | Real-time WebSocket message delivery | < 100ms |
| NFR-04 | **Scalability** | Concurrent user support per outlet | 100+ simultaneous |
| NFR-05 | **Scalability** | Multi-outlet support | 500+ outlets from single instance |
| NFR-06 | **Availability** | System uptime SLA | 99.9% |
| NFR-07 | **Availability** | Offline POS capability duration | 8+ hours without connectivity |
| NFR-08 | **Security** | Authentication | JWT + Refresh Token + MFA |
| NFR-09 | **Security** | Data encryption | AES-256 at rest, TLS 1.3 in transit |
| NFR-10 | **Security** | RBAC enforcement | Every API endpoint |
| NFR-11 | **Compliance** | Audit trail retention | 7 years minimum |
| NFR-12 | **Compliance** | GDPR/privacy compliance | PII data handling protocols |
| NFR-13 | **Maintainability** | Code coverage | > 80% unit tests |
| NFR-14 | **Maintainability** | API documentation | OpenAPI 3.0 / Swagger |
| NFR-15 | **Usability** | Mobile responsive | All interfaces |
| NFR-16 | **Usability** | Accessibility | WCAG 2.1 AA |
| NFR-17 | **Portability** | Containerization | Docker + Kubernetes ready |
| NFR-18 | **Compatibility** | Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| NFR-19 | **Reliability** | Data backup frequency | Automated daily + point-in-time recovery |
| NFR-20 | **Localization** | Multi-currency support | ISO 4217 |
| NFR-21 | **Localization** | Multi-language (i18n) | Configurable language packs |
| NFR-22 | **Observability** | Centralized logging | ELK stack or equivalent |
| NFR-23 | **Observability** | Application monitoring | APM with health checks |

---

## 5. USER ROLES & PERMISSIONS

### Role Hierarchy

```
Super Admin
  └── System Admin
       ├── Outlet Manager
       │    ├── Head Chef / Kitchen Manager
       │    ├── Floor Manager / Maître d'
       │    ├── Cashier / POS Operator
       │    ├── Waiter / Server
       │    └── Barista / Bartender
       ├── Inventory Manager
       └── HR / Staff Admin
```

### Permissions Matrix

| Role | Dashboard | Customers & Tables | Menu | Orders | KOT | POS/Billing | Inventory | Staff | Reports | Admin |
|------|-----------|--------------------|------|--------|-----|-------------|-----------|-------|---------|-------|
| **Super Admin** | All | All | All | All | All | All | All | All | All | All |
| **System Admin** | All | All | All | All | All | All | All | All | All | All |
| **Outlet Manager** | Read | All | All | All | Read | All | Read | Read | All (outlet) | Outlet only |
| **Kitchen Manager** | Read | Read | Read/Edit (food) | Read | All (kitchen) | No | Read | Read (kitchen) | Kitchen | No |
| **Floor Manager** | Read | All | Read | All | Read | Read | No | Assign tables | Floor reports | No |
| **Cashier** | No | Read | Read | Read | No | All | No | No | Own shift | No |
| **Waiter/Server** | No | Assigned section | Read | Create/Edit (own) | Read | No | No | No | No | No |
| **Barista** | No | No | Read (beverages) | Read (bar) | All (bar) | No | Read (bar stock) | No | No | No |
| **Inventory Mgr** | Read (inv) | No | No | No | No | No | All | No | Inv reports | No |
| **HR / Staff Admin** | No | No | No | No | No | No | No | All (staff) | Staff reports | No |

### Permission Granularity (per module)
Each module exposes these permission levels:
- **view** – Read-only access
- **create** – Create new records
- **edit** – Modify existing records
- **delete** – Soft-delete or archive
- **export** – Export data
- **approve** – Approve actions requiring authorization (voids, refunds, purchase orders)

---

## 6. COMPLETE MODULE BREAKDOWN

```
┌─────────────────────────────────────────────────────────┐
│                  RESTAURANT MANAGEMENT SYSTEM            │
├─────────┬──────────┬─────────┬──────────┬──────────────┤
│  MOD-01 │  MOD-02  │ MOD-03  │  MOD-04  │    MOD-05    │
│Dashboard│Customer &│  Menu   │  Order   │    KOT       │
│         │  Table   │ Mgmt    │  Mgmt    │  (Kitchen)   │
│         │  Mgmt    │         │          │              │
├─────────┼──────────┼─────────┼──────────┼──────────────┤
│  MOD-06 │  MOD-07  │ MOD-08  │  MOD-09  │    MOD-10    │
│POS &    │Inventory │ Staff   │  Admin & │  Integration │
│ Billing │  Mgmt    │  Mgmt   │Analytics │    Hub       │
└─────────┴──────────┴─────────┴──────────┴──────────────┘
```

### Module Dependencies

```
MOD-01 (Dashboard) ← reads from all modules
MOD-02 (Customer & Table) ← depends on MOD-04 (Orders)
MOD-03 (Menu) ← independent, consumed by MOD-04, MOD-05, MOD-06, MOD-07
MOD-04 (Order) ← depends on MOD-02, MOD-03; produces for MOD-05, MOD-06, MOD-07
MOD-05 (KOT) ← depends on MOD-04, MOD-03
MOD-06 (POS/Billing) ← depends on MOD-04, MOD-07
MOD-07 (Inventory) ← depends on MOD-03 (recipe mapping); consumed by MOD-06
MOD-08 (Staff) ← independent; integrates with HRMS
MOD-09 (Admin & Analytics) ← reads from all modules
MOD-10 (Integration Hub) ← bridges all modules to external ERP systems
```

---

## 7. DETAILED FEATURE LIST

### MOD-01: Dashboard
| Feature ID | Feature | Description |
|------------|---------|-------------|
| F01-001 | Revenue Widget | Real-time revenue with comparison to previous period |
| F01-002 | Order Summary Widget | Active, completed, and cancelled order counts |
| F01-003 | Table Status Widget | Occupancy rate with visual floor plan |
| F01-004 | Top Items Widget | Best-selling items for current period |
| F01-005 | Occupancy Trend | Hourly occupancy heatmap |
| F01-006 | Staff Status | Currently clocked-in staff by role |
| F01-007 | Inventory Alerts | Low-stock items requiring attention |
| F01-008 | Customer Feedback | Average rating and recent reviews |
| F01-009 | KOT Status | Orders pending in kitchen by station |
| F01-010 | Quick Actions | Shortcuts to common tasks |

### MOD-02: Customer & Table Management
| Feature ID | Feature | Description |
|------------|---------|-------------|
| F02-001 | Customer CRUD | Create, view, update, soft-delete customers |
| F02-002 | Customer Search | Search by name, phone, email, loyalty ID |
| F02-003 | Customer Groups | Classify as walk-in, registered, VIP, corporate |
| F02-004 | Floor Plan Builder | Visual drag-and-drop floor plan editor |
| F02-005 | Table CRUD | Create tables with zone, capacity, accessibility flags |
| F02-006 | Table Status Dashboard | Real-time table status grid |
| F02-007 | Reservation Create | Book tables with date, time, party size, notes |
| F02-008 | Reservation Calendar | Calendar view of all reservations |
| F02-009 | Waitlist Queue | Add to queue with auto-numbering and wait estimate |
| F02-010 | Table Merge/Split | Combine or divide tables mid-order |
| F02-011 | Table Transfer | Move order from one table to another |
| F02-012 | Customer History | Past orders, preferences, dietary flags, spend |
| F02-013 | Loyalty Points | Earn and redeem points |

### MOD-03: Menu Management
| Feature ID | Feature | Description |
|------------|---------|-------------|
| F03-001 | Category CRUD | Manage menu categories with sort order |
| F03-002 | Sub-Category CRUD | Nested categories within parent |
| F03-003 | Item CRUD | Full item management with pricing |
| F03-004 | Item Images | Upload and manage item photos |
| F03-005 | Modifier Groups | Create modifier groups (size, spice, extras) |
| F03-006 | Modifier Options | Individual modifier choices with price impact |
| F03-007 | Combo Meals | Bundle items with set pricing |
| F03-008 | Tax Rules | Assign tax rates per item or category |
| F03-009 | Allergen Management | Flag allergens per item |
| F03-010 | Nutritional Info | Calories, protein, carbs, fat per item |
| F03-011 | Availability Schedule | Time-based availability rules |
| F03-012 | Seasonal Menus | Date-range bounded menu sets |
| F03-013 | Recipe Mapping | Link items to ingredients and quantities |
| F03-014 | Kitchen Station Routing | Assign items to kitchen stations |
| F03-015 | Multi-Language Items | Item names/descriptions in multiple languages |

### MOD-04: Order Management
| Feature ID | Feature | Description |
|------------|---------|-------------|
| F04-001 | New Order | Create order with order type (dine-in, takeaway, delivery) |
| F04-002 | Add Items | Add items with modifiers to order |
| F04-003 | Modify Items | Change quantity, modifiers, or remove items |
| F04-004 | Order Status Flow | State machine: placed → confirmed → preparing → ready → served → completed |
| F04-005 | Split Bill | Split by seat, by item, or custom percentage |
| F04-006 | Hold/Recall Order | Temporarily hold and recall orders |
| F04-007 | Order Notes | Free-text instructions and dietary notes |
| F04-008 | Reorder | Clone from previous order history |
| F04-009 | Void/Cancel | Cancel with reason and manager approval |
| F04-010 | Delivery Integration | Third-party or in-house delivery order flow |
| F04-011 | Order Timeline | Visual timeline of order lifecycle events |

### MOD-05: Kitchen Order Ticket (KOT)
| Feature ID | Feature | Description |
|------------|---------|-------------|
| F05-001 | Auto KOT Generation | Triggered on order confirmation |
| F05-002 | Station Routing | Route items to appropriate kitchen stations |
| F05-003 | KDS Display | Real-time kitchen display board |
| F05-004 | KOT Status Updates | received → in-progress → ready |
| F05-005 | Priority Flagging | Mark rush/express orders |
| F05-006 | Prep Time Tracking | Estimated vs actual preparation time |
| F05-007 | Printer Integration | Print KOTs to designated printers |
| F05-008 | KOT Void/Reprint | Void or reprint with authorization |
| F05-009 | Batch KOT | Group items for batch preparation |
| F05-010 | Bump Bar Support | Hardware bump bar integration for KDS |

### MOD-06: POS & Billing
| Feature ID | Feature | Description |
|------------|---------|-------------|
| F06-001 | POS Grid | Touch-friendly quick-item grid with categories |
| F06-002 | Quick Search | Fuzzy search for menu items |
| F06-003 | Payment Processing | Cash, card, digital wallet, room charge, account |
| F06-004 | Split Payment | Pay via multiple methods |
| F06-005 | Tip Management | Add tips to bills |
| F06-006 | Discount Engine | Item/order level discounts, promo codes |
| F06-007 | Auto-Gratuity | Auto-apply for large party sizes |
| F06-008 | Invoice Generation | Print/email receipt or tax invoice |
| F06-009 | Refund Processing | Full/partial refund with approval |
| F06-010 | X-Report | Mid-day cash count |
| F06-011 | Z-Report | End-of-day register closeout |
| F06-012 | Offline POS | Queue transactions locally when offline |
| F06-013 | Multi-Currency | Accept and convert multiple currencies |
| F06-014 | Gift Card | Issue and redeem gift cards |
| F06-015 | Room Charge | Post bill to hotel guest folio |

### MOD-07: Inventory Management
| Feature ID | Feature | Description |
|------------|---------|-------------|
| F07-001 | Ingredient Catalog | CRUD for ingredients with units and cost |
| F07-002 | Recipe Mapping | Map menu items to ingredient lists and quantities |
| F07-003 | Stock Tracking | Real-time stock levels per location |
| F07-004 | Stock Inward | Log incoming stock with PO reference |
| F07-005 | Stock Outward | Log stock consumed, transferred, or wasted |
| F07-006 | Low Stock Alerts | Configurable thresholds and notifications |
| F07-007 | Purchase Orders | Create and manage POs to suppliers |
| F07-008 | Supplier Management | CRUD for suppliers with contact and terms |
| F07-009 | Wastage Tracking | Record and categorize wastage |
| F07-010 | Expiry Management | Track and alert for expiring items |
| F07-011 | Consumption Analytics | Actual vs theoretical consumption per item |
| F07-012 | Stock Reconciliation | Periodic physical count and variance report |
| F07-013 | Multi-Location Transfer | Transfer stock between store locations |

### MOD-08: Staff Management
| Feature ID | Feature | Description |
|------------|---------|-------------|
| F08-001 | Staff Profile | CRUD with photo, role, contact, emergency info |
| F08-002 | Shift Roster | Weekly/monthly shift scheduling |
| F08-003 | Clock In/Out | Time tracking with geolocation |
| F08-004 | Section Assignment | Assign servers to table sections |
| F08-005 | Performance Metrics | Orders handled, average table time, ratings |
| F08-006 | Commission Tracking | Tip pooling and commission calculation |
| F08-007 | Leave Management | Request and approve leave |
| F08-008 | Training Records | Track training completion and certifications |
| F08-009 | HRMS Sync | Bidirectional sync with HR module |

### MOD-09: Administration & Analytics
| Feature ID | Feature | Description |
|------------|---------|-------------|
| F09-001 | Outlet Management | Create and configure restaurant outlets |
| F09-002 | System Settings | Global and per-outlet configuration |
| F09-003 | User Management | Create users and assign roles |
| F09-004 | Permission Management | Configure RBAC permissions |
| F09-005 | Audit Log | Searchable audit trail of all system actions |
| F09-006 | Revenue Reports | Sales, revenue, and profit reports |
| F09-007 | Menu Analytics | Item performance, margin analysis |
| F09-008 | Customer Analytics | Visit patterns, lifetime value |
| F09-009 | Inventory Reports | Stock valuation, consumption variance |
| F09-010 | Staff Reports | Productivity, attendance, labor cost |
| F09-011 | Tax Reports | Tax collected and remittance reports |
| F09-012 | Custom Report Builder | Drag-and-drop report creation |
| F09-013 | Export Engine | PDF, Excel, CSV export |
| F09-014 | Notification Center | Configure alerts and notification channels |

### MOD-10: Integration Hub
| Feature ID | Feature | Description |
|------------|---------|-------------|
| F10-001 | Integration API Gateway | Centralized endpoint for ERP module communication |
| F10-002 | Webhook Manager | Configure outbound webhooks |
| F10-003 | Event Bus | Publish/subscribe event system |
| F10-004 | Third-Party POS Integration | Integration with payment gateways |
| F10-005 | Delivery Platform Sync | Orders from Zomato, UberEats, etc. |
| F10-006 | Hotel PMS Bridge | Guest folio, room service orders |
| F10-007 | Accounting Sync | Journal entries to Financial module |
| F10-008 | HRMS Bridge | Staff records, attendance, payroll data |

---

## 8. BUSINESS PROCESS FLOW

### End-to-End Restaurant Operation Flow

```
┌──────────────┐
│  Customer     │
│  Arrives      │
└──────┬───────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│  Check-In     │───▶│  Reservation │
│  (Walk-in /   │    │  Lookup /    │
│  Reservation) │    │  Create      │
└──────┬───────┘    └──────────────┘
       │
       ▼
┌──────────────┐
│  Table        │
│  Assignment   │────── Table Status: AVAILABLE → OCCUPIED
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Server       │
│  Takes Order  │────── Create Order (MOD-04)
└──────┬───────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│  Order Confirmed│──▶│  KOT Generated│───▶ Sent to Kitchen (MOD-05)
└──────┬───────┘    └──────────────┘
       │
       ▼
┌──────────────┐
│  Kitchen      │
│  Prepares     │────── Station receives KOT, starts preparation
│  (Prep → Cook │
│   → Plate)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Food Ready   │────── KOT status: READY ──▶ Server notified
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Served to    │────── KOT status: SERVED
│  Customer     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Additional   │────── Yes: Add items → Return to Order step
│  Orders?      │
│  No           │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Bill         │────── POS & Billing (MOD-06)
│  Generated    │────── Discount/Tax Calculation
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Payment      │────── Multiple payment methods
│  Processed    │────── Invoice generated
└──────┬───────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│  Table        │───▶│  Table Status:│
│  Cleared      │    │  OCCUPIED →  │
└──────┬───────┘    │  NEEDS-CLEANING│
       │            └──────┬───────┘
       │                   │
       │                   ▼
       │            ┌──────────────┐
       │            │  Table Cleaned│───▶ AVAILABLE
       │            └──────────────┘
       ▼
┌──────────────┐
│  Transaction  │────── Inventory consumption auto-deducted
│  Complete     │────── Financial entry posted
│  & Logged     │────── Staff performance updated
└──────────────┘
```

---

## 9. RESTAURANT WORKFLOW

### 9.1 Order Lifecycle State Machine

```
                    ┌─────────────┐
          ┌────────▶│   PLACED    │
          │         └──────┬──────┘
          │                │ (confirm)
          │                ▼
          │         ┌─────────────┐
          │   ┌─────│  CONFIRMED  │
          │   │     └──────┬──────┘
          │   │            │ (start prep)
          │   │            ▼
          │   │     ┌─────────────┐
          │   │     │  PREPARING  │
          │   │     └──────┬──────┘
          │   │            │ (prep done)
          │   │            ▼
          │   │     ┌─────────────┐
          │   │     │    READY    │──────▶ Served notification
          │   │     └──────┬──────┘
          │   │            │ (served)
          │   │            ▼
          │   │     ┌─────────────┐
          │   │     │   SERVED    │
          │   │     └──────┬──────┘
          │   │            │ (payment done)
          │   │            ▼
          │   │     ┌─────────────┐
          │   │     │  COMPLETED  │──────▶ Triggers: Inventory deduction,
          │   │     └─────────────┘        Financial entry, Analytics update
          │   │
          │   │ (modify/hold)
          │   ▼
          │  ┌─────────────┐
          └──│  ON-HOLD    │───▶ (recall) ──▶ CONFIRMED
             └─────────────┘
             
          At any stage before COMPLETED:
             ┌─────────────┐
             │  CANCELLED  │──────▶ Requires reason + authorization
             └─────────────┘
```

### 9.2 Table Status State Machine

```
  ┌──────────────┐
  │  AVAILABLE   │◀────────────────────────────────────┐
  └──────┬───────┘                                     │
         │ (reservation / seat)                        │
         ▼                                             │
  ┌──────────────┐                                    │
  │  OCCUPIED    │──────▶ (all bills paid) ──▶┌──────┴───────┐
  └──────────────┘                             │NEEDS-CLEANING│
         │ (transfer)                          └──────┬───────┘
         ▼                                            │ (cleaned)
  ┌──────────────┐                                    │
  │  TRANSFERRED │                                    │
  └──────────────┘                                    │
                                                      │
  ┌──────────────┐                                    │
  │  RESERVED    │───▶ (no-show / cancel) ──▶ AVAILABLE
  └──────────────┘                                    │
                                                      │
  ┌──────────────┐         ┌──────────────┐          │
  │MAINTENANCE   │────────▶│  MAINTENANCE │──────────┘
  └──────────────┘         └──────────────┘
```

### 9.3 Payment Processing Flow

```
  ┌──────────────┐
  │ Calculate Bill│
  │ (subtotal,    │
  │  tax, discounts,
  │  service charge)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐     ┌──────────────┐
  │ Apply Discount│────▶│ Validate     │
  │ (if any)      │     │ Promo/Coupon │
  └──────┬───────┘     └──────────────┘
         │
         ▼
  ┌──────────────┐
  │ Final Amount │
  │ Displayed    │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ Select Payment│──┐
  │ Method        │  │
  └──────┬───────┘  │
         │          │
         ▼          ▼
  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Cash   │  │  Card   │  │ Digital  │  │  Room    │  │ Corporate│
  │         │  │         │  │ Wallet   │  │  Charge  │  │ Account  │
  └────┬────┘  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │            │            │              │              │
       └────────────┴────────────┴──────────────┴──────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │  Payment     │
                   │  Confirmed   │──────▶ Generate Invoice
                   └──────┬───────┘        Update Order: COMPLETED
                          │               Update Financial Ledger
                          ▼               Update Analytics
                   ┌──────────────┐
                   │  Receipt     │──────▶ Print / Email / SMS
                   │  Generated   │
                   └──────────────┘
```

---

## 10. INTEGRATION WORKFLOW

### ERP Module Integration Points

```
┌──────────────────────────────────────────────────────────────────┐
│                     ERP INTEGRATION HUB                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐         ┌──────────────────────────────┐        │
│  │    HRMS      │◀───────▶│   Restaurant Management      │      |
│  │  Module      │         │       System (RMS)            │      │
│  └─────────────┘         └──────────────────────────────┘        │
│                                                                  │
│  Integration Points:                                             │
│  • Staff records (create/update) ──── sync from HRMS             │
│  • Attendance & time ──────────────── sync from RMS to HRMS      │
│  • Payroll data ───────────────────── RMS pushes attendance      │
│  • Leave requests ─────────────────── HRMS approval workflow     │
│  • Training/certifications ────────── HRMS manages, RMS reads    │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐         ┌──────────────────────────────┐       │
│  │  Financial   │◀───────▶│   Restaurant Management      │       │
│  │  Management  │         │       System (RMS)            │       │
│  └─────────────┘         └──────────────────────────────┘       │
│                                                                  │
│  Integration Points:                                             │
│  • Daily sales journal entries ────── auto-posted              │
│  • Tax collected ──────────────────── posted to tax ledger      │
│  • Purchase orders ────────────────── AP entries generated      │
│  • Revenue recognition ────────────── per outlet               │
│  • Cost of goods sold ─────────────── per transaction          │
│  • Cash register reconciliation ───── daily closeout           │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐         ┌──────────────────────────────┐       │
│  │  Supply     │◀───────▶│   Restaurant Management      │       │
│  │  Chain (SCM)│         │       System (RMS)            │       │
│  └─────────────┘         └──────────────────────────────┘       │
│                                                                  │
│  Integration Points:                                             │
│  • Purchase order creation ────────── triggers SCM workflow     │
│  • Stock receipt confirmation ─────── SCM delivery tracking    │
│  • Supplier management ────────────── shared supplier master   │
│  • Demand forecasting ─────────────── menu consumption data    │
│  • Multi-location transfer ────────── inter-outlet stock moves │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐         ┌──────────────────────────────┐       │
│  │   Hotel     │◀───────▶│   Restaurant Management      │       │
│  │  Management │         │       System (RMS)            │       │
│  │  System     │         └──────────────────────────────┘       │
│  └─────────────┘                                                │
│                                                                  │
│  Integration Points:                                             │
│  • Room service orders ────────────── created from hotel PMS   │
│  • Guest folio posting ────────────── room charge to guest bill│
│  • Guest preferences ──────────────── dietary, favorite items  │
│  • Event/banquet orders ───────────── large group management   │
│  • Guest loyalty ───────────────────── cross-module points     │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐         ┌──────────────────────────────┐       │
│  │ Facilities & │◀───────▶│   Restaurant Management      │       │
│  │  Admin Mgmt │         │       System (RMS)            │       │
│  └─────────────┘         └──────────────────────────────┘       │
│                                                                  │
│  Integration Points:                                             │
│  • Maintenance requests ───────────── table/equipment issues   │
│  • Utility consumption ────────────── per outlet tracking      │
│  • Cleaning schedules ─────────────── table turnover support   │
│  • Asset tracking ─────────────────── kitchen equipment        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Integration Protocol

| Method | Use Case | Direction | Protocol |
|--------|----------|-----------|----------|
| REST API (sync) | Real-time queries (e.g., check guest folio) | Bidirectional | HTTP/HTTPS + JWT |
| Event Bus (async) | Notifications, state changes (e.g., order completed) | Outbound | Redis Pub/Sub / RabbitMQ |
| Webhook | Third-party callbacks (e.g., payment confirmation) | Inbound | HTTP POST + HMAC signature |
| Scheduled Jobs | Batch sync (e.g., daily sales to finance) | Outbound | CRON + message queue |
| Shared Database Views | Read-heavy cross-module queries | Read-only | DB views / materialized views |
| File Export/Import | Legacy system integration | Bidirectional | CSV/JSON via SFTP |

---

## 11. DATABASE PLANNING

### Design Principles
1. **Third Normal Form (3NF)** as baseline, with denormalization for performance-critical reads
2. **Soft deletes** everywhere (deleted_at timestamp) for audit compliance
3. **UUID primary keys** for distributed system compatibility
4. **Tenant isolation** via `outlet_id` on all operational tables
5. **Temporal data** using `valid_from` / `valid_to` for historical tracking
6. **Audit columns** (created_by, updated_by, created_at, updated_at) on every table
7. **Enum-like tables** for configurable lookup values (status codes, payment types, etc.)

### Schema Organization

```
PostgreSQL Database
├── public (default schema)
│   ├── Core Tables (shared across all modules)
│   ├── auth_* (authentication and authorization)
│   └── system_* (system configuration, audit)
│
├── rms_outlet (outlet-level data)
│   ├── Customer tables
│   ├── Table/Floor plan tables
│   ├── Menu tables
│   ├── Order tables
│   ├── KOT tables
│   ├── POS/Billing tables
│   ├── Inventory tables
│   └── Staff tables
│
└── rms_analytics (read-optimized)
    ├── Aggregated reports
    └── Materialized views
```

---

## 12. POSTGRESQL TABLE LIST

### Authentication & Authorization Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 1 | `users` | System users (admin, staff, managers) |
| 2 | `roles` | Role definitions (super-admin, manager, waiter, etc.) |
| 3 | `permissions` | Granular permissions per module/action |
| 4 | `role_permissions` | Many-to-many: roles ↔ permissions |
| 5 | `user_roles` | Many-to-many: users ↔ roles (per outlet) |
| 6 | `password_resets` | Password reset tokens |
| 7 | `mfa_tokens` | Multi-factor authentication tokens |
| 8 | `login_attempts` | Failed login tracking |

### System Configuration Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 9 | `outlets` | Restaurant outlet/branch definitions |
| 10 | `outlet_configs` | Per-outlet configuration (tax rates, settings) |
| 11 | `audit_logs` | System-wide audit trail |
| 12 | `notification_configs` | Alert and notification rules |
| 13 | `notification_logs` | Sent notifications history |
| 14 | `lookup_tables` | Configurable enum-like values |
| 15 | `currencies` | Supported currencies |
| 16 | `languages` | Supported languages for i18n |

### Customer & Table Management Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 17 | `customers` | Customer profiles |
| 18 | `customer_loyalty` | Loyalty points balance and history |
| 19 | `customer_preferences` | Saved preferences |
| 20 | `floor_plans` | Floor plan layouts per outlet |
| 21 | `floor_zones` | Sections/areas within a floor plan |
| 22 | `tables` | Physical tables with capacity and attributes |
| 23 | `table_status_history` | Log of all table status changes |
| 24 | `reservations` | Future table bookings |
| 25 | `waitlist` | Walk-in queue entries |
| 26 | `table_assignments` | Server-to-section assignments |

### Menu Management Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 27 | `menu_categories` | Top-level menu categories |
| 28 | `menu_subcategories` | Sub-categories within parent |
| 29 | `menu_items` | Individual menu items with pricing |
| 30 | `menu_item_images` | Photos for menu items |
| 31 | `menu_item_variants` | Variants (size, portion) per item |
| 32 | `modifier_groups` | Groups of modifiers |
| 33 | `modifier_options` | Individual modifier choices |
| 34 | `item_modifier_groups` | Link items to modifier groups |
| 35 | `combo_items` | Items included in combo meals |
| 36 | `combo_meals` | Combo/set meal definitions |
| 37 | `menu_item_allergens` | Allergen flags per item |
| 38 | `menu_item_nutrition` | Nutritional information per item |
| 39 | `menu_availability_rules` | Time-based availability per item |
| 40 | `menu_item_translations` | Multi-language item names/descriptions |
| 41 | `tax_rules` | Tax rate configurations |
| 42 | `kitchen_stations` | Kitchen station/department definitions |
| 43 | `item_station_routing` | Which station prepares which item |

### Order Management Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 44 | `orders` | Master order records |
| 45 | `order_items` | Individual line items in an order |
| 46 | `order_item_modifiers` | Modifiers selected per order item |
| 47 | `order_status_history` | Timeline of order state changes |
| 48 | `order_notes` | Special instructions per order |
| 49 | `order_split_history` | Records of bill splits |
| 50 | `order_holds` | Orders currently on hold |
| 51 | `order_cancellations` | Void/cancel records with reasons |
| 52 | `delivery_orders` | Delivery-specific order metadata |
| 53 | `order_discounts` | Discounts applied to orders |

### Kitchen Order Ticket (KOT) Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 54 | `kot_tickets` | Kitchen order ticket headers |
| 55 | `kot_items` | Items on a KOT |
| 56 | `kot_status_history` | KOT state change timeline |
| 57 | `kot_printer_mappings` | Station-to-printer assignments |
| 58 | `kot_priority_flags` | Priority/escalation records |
| 59 | `kot_prep_times` | Actual vs estimated prep time logs |

### POS & Billing Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 60 | `invoices` | Final bills/invoices |
| 61 | `invoice_line_items` | Detailed line items per invoice |
| 62 | `payments` | Payment records per invoice |
| 63 | `payment_methods` | Supported payment method types |
| 64 | `refunds` | Refund transactions |
| 65 | `discounts` | Discount/coupon definitions |
| 66 | `applied_discounts` | Discounts applied to specific orders/invoices |
| 67 | `tips` | Tip records per payment |
| 68 | `cash_register_sessions` | POS terminal session tracking |
| 69 | `cash_register_entries` | Individual entries (cash in, cash out, sales) |
| 70 | `cash_register_closeouts` | X-report and Z-report records |
| 71 | `gift_cards` | Gift card definitions and balances |
| 72 | `gift_card_transactions` | Gift card usage history |
| 73 | `offline_transaction_queue` | Queue for offline POS sync |
| 74 | `tax_entries` | Tax calculated and collected per invoice |

### Inventory Management Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 75 | `ingredients` | Raw material/ingredient master |
| 76 | `ingredient_units` | Units of measure |
| 77 | `recipes` | Menu item ↔ ingredient mapping |
| 78 | `recipe_ingredients` | Individual ingredients in a recipe |
| 79 | `stock_levels` | Current stock per location |
| 80 | `stock_movements` | All stock inward/outward transactions |
| 81 | `stock_adjustments` | Manual adjustments with reasons |
| 82 | `stock_transfers` | Inter-location stock transfers |
| 83 | `suppliers` | Supplier master data |
| 84 | `purchase_orders` | Purchase order headers |
| 85 | `purchase_order_items` | Line items on POs |
| 86 | `purchase_order_receipts` | Received goods records |
| 87 | `wastage_records` | Wastage logging |
| 88 | `expiry_records` | Expiring item tracking |
| 89 | `consumption_logs` | Actual consumption per order |
| 90 | `stock_reconciliation` | Periodic physical count records |
| 91 | `reorder_alerts` | Low-stock alert configurations |

### Staff Management Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 92 | `staff_profiles` | Restaurant staff member profiles |
| 93 | `staff_roles` | Restaurant-specific role definitions |
| 94 | `shift_templates` | Reusable shift templates |
| 95 | `shift_schedules` | Assigned shifts per staff member |
| 96 | `time_clock_entries` | Clock-in/clock-out records |
| 97 | `staff_section_assignments` | Server-to-table-section mapping |
| 98 | `staff_performance` | Aggregated performance metrics |
| 99 | `staff_commissions` | Commission/incentive records |
| 100 | `leave_requests` | Staff leave requests |
| 101 | `training_records` | Training completion tracking |

### Analytics & Reporting Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 102 | `daily_sales_summary` | Aggregated daily sales per outlet |
| 103 | `hourly_sales_snapshot` | Hourly granularity sales data |
| 104 | `menu_item_sales` | Per-item sales aggregation |
| 105 | `customer_visit_logs` | Customer visit frequency tracking |
| 106 | `report_schedules` | Automated report generation configs |
| 107 | `report_exports` | Exported report file references |
| 108 | `kpi_targets` | KPI goal definitions per outlet |
| 109 | `kpi_snapshots` | Periodic KPI value captures |

### Integration Hub Tables

| # | Table Name | Purpose |
|---|------------|---------|
| 110 | `integration_configs` | External system connection configs |
| 111 | `webhook_configs` | Outbound webhook definitions |
| 112 | `webhook_logs` | Webhook delivery history |
| 113 | `event_logs` | Published/subscribed event records |
| 114 | `sync_logs` | Data synchronization history |
| 115 | `third_party_order_sync` | External delivery platform order sync |
| 116 | `accounting_entries` | Journal entries posted to Finance module |

**Total: 116 tables**

---

## 13. ENTITY RELATIONSHIP DIAGRAM (ERD)

### Key ER Relationships

| Relationship | Type | Description |
|-------------|------|-------------|
| Outlet → Orders | 1:N | One outlet has many orders |
| Outlet → Tables | 1:N | One outlet has many tables |
| Floor Plan → Tables | 1:N | One floor plan contains many tables |
| Floor Zone → Tables | 1:N | One zone has many tables |
| Table → Orders | 1:N | One table can have multiple orders over time |
| Order → Order Items | 1:N | One order has many line items |
| Order → KOT Tickets | 1:N | One order can generate multiple KOTs |
| Order → Invoice | 1:1 | One order produces one invoice |
| Invoice → Payments | 1:N | One invoice can have multiple payments (split) |
| Menu Category → Items | 1:N | One category has many items |
| Menu Item → Variants | 1:N | One item can have multiple variants |
| Menu Item → Recipes | 1:1 | One item has one recipe definition |
| Recipe → Recipe Ingredients | 1:N | One recipe has many ingredients |
| Ingredient → Stock Levels | 1:N | One ingredient tracked at multiple locations |
| Staff Profile → Shift Schedules | 1:N | One staff has many scheduled shifts |
| Customer → Orders | 1:N | One customer can have many orders |
| Customer → Loyalty | 1:1 | One loyalty record per customer |
| Combo Meal → Combo Items | 1:N | One combo has many items |
| Modifier Group → Modifier Options | 1:N | One group has many choices |
| Item Modifier Groups (junction) | M:N | Items ↔ Modifier Groups |
| Item Station Routing (junction) | M:N | Items ↔ Kitchen Stations |

---

## 14. DATABASE RELATIONSHIPS

### Relationship Summary by Module

#### Customer & Table Module
```
outlets ──1:N──> floor_plans ──1:N──> floor_zones ──1:N──> tables
outlets ──1:N──> tables
tables ──1:N──> table_status_history
customers ──1:1──> customer_loyalty
customers ──1:N──> customer_preferences
customers ──1:N──> orders (via orders.customer_id)
tables ──1:N──> orders (via orders.table_id)
reservations ──N:1──> tables
reservations ──N:1──> customers
waitlist ──N:1──> outlets
```

#### Menu Module
```
outlets ──1:N──> menu_categories ──1:N──> menu_subcategories ──1:N──> menu_items
menu_items ──1:N──> menu_item_variants
menu_items ──1:N──> menu_item_images
menu_items ──M:N──> modifier_groups (via item_modifier_groups)
modifier_groups ──1:N──> modifier_options
menu_items ──1:1──> recipes ──1:N──> recipe_ingredients ──N:1──> ingredients
ingredients ──N:1──> ingredient_units
kitchen_stations ──M:N──> menu_items (via item_station_routing)
```

#### Order & KOT Module
```
orders ──1:N──> order_items ──1:N──> order_item_modifiers
orders ──1:N──> order_status_history
orders ──1:N──> order_notes
orders ──1:N──> order_discounts
orders ──1:N──> kot_tickets ──1:N──> kot_items
kot_tickets ──1:N──> kot_status_history
orders ──N:1──> customers
orders ──N:1──> tables
orders ──N:1──> users (server who took the order)
```

#### POS & Billing Module
```
orders ──1:1──> invoices ──1:N──> payments ──1:N──> tips
invoices ──1:N──> refunds
invoices ──1:N──> tax_entries
invoices ──1:N──> applied_discounts ──N:1──> discounts
payments ──N:1──> payment_methods
cash_register_sessions ──1:N──> cash_register_entries
cash_register_sessions ──1:1──> cash_register_closeouts
```

#### Inventory Module
```
ingredients ──1:N──> stock_levels (per outlet/location)
ingredients ──1:N──> stock_movements
outlets ──1:N──> stock_levels
recipes ──1:N──> recipe_ingredients ──N:1──> ingredients
suppliers ──1:N──> purchase_orders ──1:N──> purchase_order_items
purchase_orders ──1:N──> purchase_order_receipts
outlets ──1:N──> wastage_records
```

#### Staff Module
```
users ──1:1──> staff_profiles ──1:N──> shift_schedules
shift_templates ──1:N──> shift_schedules
staff_profiles ──1:N──> time_clock_entries
staff_profiles ──1:N──> staff_section_assignments ──N:1──> floor_zones
staff_profiles ──1:N──> staff_performance
staff_profiles ──1:N──> staff_commissions
staff_profiles ──1:N──> leave_requests
staff_profiles ──1:N──> training_records
```

---

## 15. API ARCHITECTURE

### API Design Principles
- **RESTful** with consistent resource naming
- **Versioned** (`/api/v1/...`)
- **Paginated** for all list endpoints with cursor-based pagination
- **Filterable, sortable, searchable** via query parameters
- **JSON:API** compliant response format
- **HATEOAS** links for discoverability on key resources
- **Rate limited** per user role and endpoint type
- **Idempotency** support on financial operations via idempotency keys

### API Response Structure

```json
{
  "status": "success",
  "code": 200,
  "message": "Resource retrieved successfully",
  "data": { },
  "meta": {
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_pages": 15,
      "total_items": 287
    }
  },
  "links": {
    "self": "/api/v1/orders?page=1",
    "next": "/api/v1/orders?page=2",
    "prev": null
  }
}
```

### API Endpoint Catalog

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| POST | `/api/v1/auth/mfa/enable` | Enable MFA |
| POST | `/api/v1/auth/mfa/verify` | Verify MFA code |

#### Dashboard (MOD-01)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/summary` | Overview widgets data |
| GET | `/api/v1/dashboard/revenue` | Revenue metrics |
| GET | `/api/v1/dashboard/orders` | Order summary |
| GET | `/api/v1/dashboard/tables` | Table occupancy |
| GET | `/api/v1/dashboard/alerts` | System alerts |

#### Customers (MOD-02)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customers` | List customers |
| POST | `/api/v1/customers` | Create customer |
| GET | `/api/v1/customers/{id}` | Get customer detail |
| PUT | `/api/v1/customers/{id}` | Update customer |
| DELETE | `/api/v1/customers/{id}` | Soft-delete customer |
| GET | `/api/v1/customers/{id}/orders` | Customer order history |
| GET | `/api/v1/customers/{id}/loyalty` | Loyalty balance |

#### Tables (MOD-02)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/floor-plans` | List floor plans |
| POST | `/api/v1/floor-plans` | Create floor plan |
| GET | `/api/v1/tables` | List tables |
| POST | `/api/v1/tables` | Create table |
| PUT | `/api/v1/tables/{id}` | Update table |
| PATCH | `/api/v1/tables/{id}/status` | Change table status |
| POST | `/api/v1/tables/merge` | Merge tables |
| POST | `/api/v1/tables/split` | Split table |
| POST | `/api/v1/tables/transfer` | Transfer order between tables |

#### Reservations (MOD-02)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reservations` | List reservations |
| POST | `/api/v1/reservations` | Create reservation |
| PUT | `/api/v1/reservations/{id}` | Update reservation |
| PATCH | `/api/v1/reservations/{id}/status` | Confirm/cancel/no-show |
| GET | `/api/v1/reservations/calendar` | Calendar view data |
| POST | `/api/v1/waitlist` | Add to waitlist |
| GET | `/api/v1/waitlist` | View waitlist |

#### Menu (MOD-03)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/menu/categories` | List categories |
| POST | `/api/v1/menu/categories` | Create category |
| PUT | `/api/v1/menu/categories/{id}` | Update category |
| DELETE | `/api/v1/menu/categories/{id}` | Delete category |
| GET | `/api/v1/menu/items` | List menu items |
| POST | `/api/v1/menu/items` | Create menu item |
| PUT | `/api/v1/menu/items/{id}` | Update menu item |
| PATCH | `/api/v1/menu/items/{id}/availability` | Toggle availability |
| POST | `/api/v1/menu/items/{id}/images` | Upload item image |
| GET | `/api/v1/menu/modifiers` | List modifier groups |
| POST | `/api/v1/menu/modifiers` | Create modifier group |
| GET | `/api/v1/menu/combos` | List combo meals |
| POST | `/api/v1/menu/combos` | Create combo meal |
| GET | `/api/v1/menu/allergens` | List allergens |
| GET | `/api/v1/menu/kitchen-stations` | List kitchen stations |

#### Orders (MOD-04)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/orders` | List orders |
| POST | `/api/v1/orders` | Create order |
| GET | `/api/v1/orders/{id}` | Get order detail |
| PUT | `/api/v1/orders/{id}` | Update order |
| PATCH | `/api/v1/orders/{id}/status` | Update order status |
| POST | `/api/v1/orders/{id}/items` | Add item to order |
| PUT | `/api/v1/orders/{id}/items/{itemId}` | Modify order item |
| DELETE | `/api/v1/orders/{id}/items/{itemId}` | Remove order item |
| POST | `/api/v1/orders/{id}/hold` | Hold order |
| POST | `/api/v1/orders/{id}/recall` | Recall held order |
| POST | `/api/v1/orders/{id}/split` | Split bill |
| POST | `/api/v1/orders/{id}/void` | Void/cancel order |
| GET | `/api/v1/orders/{id}/timeline` | Order timeline |
| POST | `/api/v1/orders/{id}/reorder` | Reorder from history |

#### KOT (MOD-05)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/kot` | List KOT tickets |
| GET | `/api/v1/kot/{id}` | Get KOT detail |
| PATCH | `/api/v1/kot/{id}/status` | Update KOT status |
| POST | `/api/v1/kot/{id}/print` | Print KOT |
| POST | `/api/v1/kot/{id}/void` | Void KOT |
| POST | `/api/v1/kot/{id}/reprint` | Reprint KOT |
| GET | `/api/v1/kot/station/{stationId}` | KOTs for specific station |

#### POS & Billing (MOD-06)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/invoices` | List invoices |
| POST | `/api/v1/invoices/generate` | Generate invoice from order |
| GET | `/api/v1/invoices/{id}` | Get invoice detail |
| POST | `/api/v1/invoices/{id}/pay` | Process payment |
| POST | `/api/v1/invoices/{id}/split-payment` | Split payment |
| POST | `/api/v1/invoices/{id}/refund` | Process refund |
| GET | `/api/v1/invoices/{id}/receipt` | Get/print receipt |
| POST | `/api/v1/discounts` | Create discount/promo |
| GET | `/api/v1/cash-register/sessions` | List register sessions |
| POST | `/api/v1/cash-register/open` | Open register session |
| POST | `/api/v1/cash-register/close` | Close register (Z-report) |
| GET | `/api/v1/cash-register/x-report` | Mid-day X-report |
| GET | `/api/v1/gift-cards` | List gift cards |
| POST | `/api/v1/gift-cards` | Issue gift card |
| POST | `/api/v1/gift-cards/redeem` | Redeem gift card |

#### Inventory (MOD-07)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/inventory/ingredients` | List ingredients |
| POST | `/api/v1/inventory/ingredients` | Create ingredient |
| PUT | `/api/v1/inventory/ingredients/{id}` | Update ingredient |
| GET | `/api/v1/inventory/stock` | Stock levels |
| POST | `/api/v1/inventory/stock/inward` | Record stock inward |
| POST | `/api/v1/inventory/stock/outward` | Record stock outward |
| POST | `/api/v1/inventory/stock/adjust` | Manual stock adjustment |
| GET | `/api/v1/inventory/recipes` | List recipes |
| POST | `/api/v1/inventory/recipes` | Create recipe mapping |
| GET | `/api/v1/inventory/suppliers` | List suppliers |
| POST | `/api/v1/inventory/suppliers` | Create supplier |
| GET | `/api/v1/inventory/purchase-orders` | List POs |
| POST | `/api/v1/inventory/purchase-orders` | Create PO |
| GET | `/api/v1/inventory/wastage` | Wastage records |
| POST | `/api/v1/inventory/wastage` | Log wastage |
| GET | `/api/v1/inventory/expiry` | Expiring items |
| POST | `/api/v1/inventory/transfer` | Inter-location transfer |
| GET | `/api/v1/inventory/reconciliation` | Reconciliation records |

#### Staff (MOD-08)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/staff` | List staff |
| POST | `/api/v1/staff` | Create staff profile |
| PUT | `/api/v1/staff/{id}` | Update staff profile |
| GET | `/api/v1/staff/{id}` | Get staff detail |
| GET | `/api/v1/staff/{id}/performance` | Performance metrics |
| POST | `/api/v1/staff/clock-in` | Clock in |
| POST | `/api/v1/staff/clock-out` | Clock out |
| GET | `/api/v1/staff/schedule` | View shift schedule |
| POST | `/api/v1/staff/schedule` | Create shift schedule |
| GET | `/api/v1/staff/{id}/commissions` | Commission records |
| POST | `/api/v1/staff/{id}/leave` | Request leave |

#### Administration (MOD-09)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/outlets` | List outlets |
| POST | `/api/v1/admin/outlets` | Create outlet |
| PUT | `/api/v1/admin/outlets/{id}` | Update outlet |
| GET | `/api/v1/admin/users` | List users |
| POST | `/api/v1/admin/users` | Create user |
| PUT | `/api/v1/admin/users/{id}` | Update user |
| GET | `/api/v1/admin/roles` | List roles |
| POST | `/api/v1/admin/roles` | Create role |
| GET | `/api/v1/admin/permissions` | List permissions |
| GET | `/api/v1/admin/audit-logs` | Audit trail |
| GET | `/api/v1/admin/settings` | System settings |
| PUT | `/api/v1/admin/settings` | Update settings |

#### Reports & Analytics (MOD-09)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reports/revenue` | Revenue reports |
| GET | `/api/v1/reports/sales` | Sales breakdown |
| GET | `/api/v1/reports/menu-performance` | Menu analytics |
| GET | `/api/v1/reports/customer-analytics` | Customer analytics |
| GET | `/api/v1/reports/inventory` | Inventory reports |
| GET | `/api/v1/reports/staff` | Staff productivity |
| GET | `/api/v1/reports/tax` | Tax compliance |
| POST | `/api/v1/reports/custom` | Custom report builder |
| POST | `/api/v1/reports/export` | Export report |

#### WebSocket Channels
| Channel | Event | Description |
|---------|-------|-------------|
| `outlet.{id}.orders` | order.updated | Order status change |
| `outlet.{id}.kot` | kot.new | New KOT generated |
| `outlet.{id}.kot` | kot.updated | KOT status update |
| `outlet.{id}.tables` | table.status | Table status change |
| `outlet.{id}.dashboard` | dashboard.refresh | Dashboard data update |
| `outlet.{id}.notifications` | alert.new | System alert |

---

## 16. PROJECT STRUCTURE & FOLDER ORGANIZATION

### Existing Repository Structure

The Restaurant Management System is one module of a larger capstone project. The existing GitHub repository is located at:

**Repository**: `https://github.com/gaumlorenz-web/nextjs-app`

The Restaurant Management System resides inside the `restaurant/` directory. Other capstone teams develop their modules independently in separate directories within the same repository.

```
nextjs-app/                          (Root - managed by Lead Programmer)
├── restaurant/                      ← OUR MODULE (Restaurant Management System)
│   ├── backend/                     (Laravel API)
│   │   ├── app/
│   │   │   ├── Console/Commands/
│   │   │   ├── Exceptions/
│   │   │   ├── Http/
│   │   │   │   ├── Controllers/Api/V1/
│   │   │   │   │   ├── Auth/
│   │   │   │   │   ├── Dashboard/
│   │   │   │   │   ├── Customer/
│   │   │   │   │   ├── Table/
│   │   │   │   │   ├── Menu/
│   │   │   │   │   ├── Order/
│   │   │   │   │   ├── KOT/
│   │   │   │   │   ├── POS/
│   │   │   │   │   ├── Inventory/
│   │   │   │   │   ├── Staff/
│   │   │   │   │   ├── Admin/
│   │   │   │   │   ├── Reports/
│   │   │   │   │   └── Integration/
│   │   │   │   ├── Middleware/
│   │   │   │   ├── Requests/
│   │   │   │   └── Resources/
│   │   │   ├── Models/
│   │   │   │   └── Concerns/
│   │   │   ├── Notifications/
│   │   │   ├── Policies/
│   │   │   ├── Observers/
│   │   │   ├── Services/
│   │   │   ├── Events/
│   │   │   ├── Listeners/
│   │   │   ├── Jobs/
│   │   │   └── Providers/
│   │   ├── bootstrap/
│   │   ├── config/
│   │   │   └── rms/
│   │   ├── database/
│   │   │   ├── factories/
│   │   │   ├── migrations/
│   │   │   └── seeders/
│   │   ├── routes/
│   │   │   ├── api.php
│   │   │   └── api/
│   │   ├── tests/
│   │   │   ├── Unit/
│   │   │   ├── Feature/
│   │   │   ├── Integration/
│   │   │   └── Performance/
│   │   ├── docker-compose.yml
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   └── frontend/                    (Next.js App)
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   │   ├── login/
│       │   │   │   ├── forgot-password/
│       │   │   │   └── reset-password/
│       │   │   ├── (protected)/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── customers/
│       │   │   │   ├── tables/
│       │   │   │   ├── menu/
│       │   │   │   ├── orders/
│       │   │   │   ├── kitchen/
│       │   │   │   ├── pos/
│       │   │   │   ├── inventory/
│       │   │   │   ├── staff/
│       │   │   │   ├── reports/
│       │   │   │   └── admin/
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   ├── layout/
│       │   │   ├── shared/
│       │   │   └── charts/
│       │   ├── hooks/
│       │   ├── lib/
│       │   │   ├── api/
│       │   │   ├── websocket/
│       │   │   ├── offline/
│       │   │   ├── utils/
│       │   │   └── types/
│       │   ├── stores/
│       │   ├── providers/
│       │   └── styles/
│       ├── tests/
│       ├── docker-compose.yml
│       ├── Dockerfile
│       └── README.md
│
├── hrms/                            (Other capstone module - HRMS)
├── finance/                         (Other capstone module - Finance)
├── supply-chain/                    (Other capstone module - Supply Chain)
├── hotel/                           (Other capstone module - Hotel)
├── facilities/                      (Other capstone module - Facilities)
└── shared/                          (Shared utilities across all modules)
    ├── auth/                        (Shared authentication)
    ├── types/                       (Shared TypeScript/PHP types)
    ├── utils/                       (Shared utility functions)
    └── api-standards/               (Shared API response standards)
```

### Integration Rules for Folder Organization

When organizing the Restaurant module, follow these rules to minimize merge conflicts during integration:

- **Keep the `restaurant/` directory self-contained.** All Restaurant-specific code, config, and assets live inside `restaurant/`. Do not place Restaurant files outside this directory.
- **Use the `shared/` directory only for truly cross-module code.** Shared auth, types, and API standards go in `shared/`. Never put Restaurant-specific logic there.
- **Prefix Restaurant-specific database tables with `rms_`.** This prevents table name collisions when all modules share the same PostgreSQL database.
- **Prefix Restaurant-specific API routes with `/api/v1/restaurant/`.** This prevents route conflicts with other modules.
- **Use consistent naming conventions:**
  - Backend: PSR-4 autoloading, Laravel conventions (PascalCase models, camelCase methods)
  - Frontend: kebab-case for folders, PascalCase for components, camelCase for functions/variables
  - Database: snake_case for tables and columns
  - API routes: kebab-case for URL segments (e.g., `/menu-items`, not `/menuItems`)

### Reusable Components & Shared Utilities

The following should be placed in the `shared/` directory for all modules to use:

| Item | Location | Purpose |
|------|----------|---------|
| Authentication middleware | `shared/auth/` | JWT validation, RBAC checks |
| API response format | `shared/api-standards/` | Standardized `{ status, code, message, data, meta }` |
| TypeScript types | `shared/types/` | Common interfaces (User, Role, Outlet) |
| Utility functions | `shared/utils/` | Date formatting, currency formatting, validation |
| Error handling | `shared/errors/` | Standardized error codes and responses |
| Logging utilities | `shared/logging/` | Consistent logging format across modules |

### REST API Standards for Integration

All modules must follow these API standards for the Lead Programmer to integrate successfully:

| Standard | Requirement |
|----------|-------------|
| Base URL | `/api/v1/{module}/...` (e.g., `/api/v1/restaurant/orders`) |
| Authentication | Bearer JWT token in `Authorization` header |
| Content Type | `application/json` for all requests and responses |
| Pagination | `?page=1&per_page=20` with cursor-based fallback |
| Filtering | `?filter[field]=value` query parameter syntax |
| Sorting | `?sort=field:asc` or `?sort=field:desc` |
| Date Format | ISO 8601 (`2026-07-23T10:30:00Z`) |
| ID Format | UUID v4 for all resource identifiers |
| Soft Deletes | Use `DELETE` endpoint but set `deleted_at` (never hard delete) |
| Error Response | `{ status: "error", code: 4xx/5xx, message: "...", errors: {} } |

### Versioning Practices

| Aspect | Convention |
|--------|------------|
| API Version | URL-based: `/api/v1/`, `/api/v2/` |
| Module Version | Semantic versioning in each module's `README.md` |
| Database Migrations | Sequential numbered files, never modify committed migrations |
| Breaking Changes | Always increment API version number |
| Git Branching | `main` (stable), `develop` (integration), `feature/*`, `fix/*` |

---

## 17. SYSTEM ARCHITECTURE DIAGRAM

### Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14+ (React 18, TypeScript) | SSR/SSG web application |
| UI Library | shadcn/ui + Tailwind CSS | Component library and styling |
| State | Zustand | Client-side state management |
| Charts | Recharts / Chart.js | Data visualization |
| Backend | Laravel 11+ (PHP 8.2+) | REST API and business logic |
| Queue | Laravel Horizon + Redis | Async job processing |
| WebSocket | Laravel WebSockets / Soketi | Real-time communication |
| Database | PostgreSQL 16+ | Primary relational database |
| Cache | Redis 7+ | Caching, sessions, pub/sub |
| Search | Elasticsearch 8+ (optional) | Full-text search, analytics |
| Storage | AWS S3 / MinIO | File and image storage |
| Container | Docker + Docker Compose | Development and deployment |
| Orchestration | Kubernetes (production) | Container orchestration |
| Reverse Proxy | Nginx | Load balancing, SSL termination |
| CI/CD | GitHub Actions / GitLab CI | Automated build and deploy |
| Monitoring | Prometheus + Grafana | Metrics and monitoring |
| Logging | ELK Stack | Centralized logging |

### High-Level Architecture Layers

```
CLIENT LAYER → API GATEWAY LAYER → APPLICATION LAYER → DATA LAYER → INTEGRATION LAYER
```

---

## 18. SEQUENCE DIAGRAM

### Order Lifecycle Sequence

```
Server → Frontend → API → Service → DB → Kitchen Display

1. Server creates order → POST /orders → Validate → Store → 201 Created
2. Server confirms order → PATCH /orders/{id}/status → Validate transition
   → Update status → Auto-generate KOT → Emit event → Broadcast via WebSocket
3. Kitchen receives KOT on display → Chef starts preparation
4. Chef updates KOT status → IN-PROGRESS → READY → Broadcast to server
5. Server serves food → Updates order status → SERVED → Auto-deduct inventory
6. Cashier processes payment → POST /invoices/{id}/pay → Validate → 
   Process payment → Record → Update order COMPLETED → Post financial entry
```

### Payment Processing Sequence

```
Cashier → POS → API → Payment Service → Payment Gateway → DB

1. Initiate payment → Calculate final amount (subtotal + tax - discounts + tip)
2. Select payment method → Validate method
3. Process via gateway (if card/digital) → Receive confirmation
4. Record payment in DB → Update invoice status → Update order status COMPLETED
5. Async: Post financial entry to Finance module
6. Generate and display/print receipt
```

---

## 19. DATA FLOW DIAGRAM

### Level 0 (Context Diagram)
- Customers, Servers, Kitchen Staff, Managers, POS, Inventory System, Payment Gateways, ERP Modules all interact with the RMS.

### Level 1 (Major Processes)
- P1: Manage Customers & Tables
- P2: Manage Menu & Pricing
- P3: Process Orders & POS
- P4: Manage Kitchen (KOT)
- P5: Manage Inventory
- P6: Manage Staff
- P7: Generate Reports
- P8: Integrate with ERP

### Data Stores
- D1: Customer & Table Store
- D2: Menu Data Store
- D3: Order & Payment Store
- D4: KOT Data Store
- D5: Inventory Data Store
- D6: Staff & Schedule Store
- D7: Report Data Store
- D8: Integration Logs Store

---

## 20. USE CASE DIAGRAM

### Actors
Super Admin, System Admin, Outlet Manager, Floor Manager, Kitchen Manager, Cashier, Waiter/Server, Barista, Customer, Kitchen Staff, Inventory Manager, HR/Staff Admin

### Use Case Groups
- UC-01: Authentication (6 use cases)
- UC-02: Dashboard (6 use cases)
- UC-03: Customer Management (6 use cases)
- UC-04: Table Management (8 use cases)
- UC-05: Reservation Management (8 use cases)
- UC-06: Menu Management (11 use cases)
- UC-07: Order Management (12 use cases)
- UC-08: Kitchen Order Ticket (8 use cases)
- UC-09: POS & Billing (19 use cases)
- UC-10: Inventory Management (14 use cases)
- UC-11: Staff Management (10 use cases)
- UC-12: Reports & Analytics (9 use cases)
- UC-13: Administration (6 use cases)
- UC-14: Integration (7 use cases)

**Total: 130 individual use cases**

### Key Use Case Relationships
- UC-07.1 (Create Order) includes UC-04.3 (Update Table Status)
- UC-07.1 (Create Order) includes UC-08.1 (Auto-Generate KOT)
- UC-09.11 (Generate Invoice) includes UC-07.10 (Update Order to COMPLETED)
- UC-09.19 (Offline Transaction) extends any payment method

---

## 21. INTEGRATION DIAGRAM

### External System Integration Map

```
ERP Integration Bus (Event-Driven Architecture)
├── HRMS Connector → Staff records, attendance, leave, training
├── Finance Connector → Sales journal, tax ledger, AP entries
├── SCM Connector → Purchase orders, stock transfers, demand forecast
├── Hotel Connector → Room charges, room service, guest preferences
└── Facilities Connector → Maintenance, utilities, asset tracking

Third-Party Integrations
├── Payment Gateway → Stripe, Square, PayPal, Adyen, Braintree
├── Delivery Platforms → UberEats, DoorDash, Zomato, GrabFood
├── Printer Service → ESC/POS, Star Micronics, Epson TM, Custom KDS
└── Notification Service → FCM, Firebase, Nexmo/Twilio, SendGrid, Pusher
```

### Integration Error Handling Strategy

| Error Type | Handling | Retry | Escalation |
|------------|----------|-------|------------|
| Network timeout | Exponential backoff | 3 retries | Alert admin |
| Auth failure | Re-authenticate | 1 retry | Alert admin |
| Data validation | Log and quarantine | No retry | Notify team |
| Rate limit | Queue and delay | Backoff | Monitor queue |
| Partial sync | Atomic transaction | Rollback | Full re-sync |

---

## 22. SECURITY ARCHITECTURE

### Security Layers
1. **Network Security**: TLS 1.3, WAF, DDoS protection, network segmentation, VPN
2. **Application Security**: JWT + MFA, RBAC, rate limiting, CSRF/XSS/SQL injection prevention, input validation
3. **Data Security**: AES-256 at rest, field-level PII encryption, Argon2id passwords, encrypted backups
4. **Audit & Compliance**: Immutable audit logs, session management, account lockout, IP whitelist, GDPR compliance
5. **Infrastructure Security**: Container scanning, dependency scanning, secrets management, least-privilege IAM, immutable infra

### Authentication Flow
- Login → Validate credentials → If MFA required, return temp token → Submit MFA → Issue JWT (15min) + Refresh Token (7 days)
- API calls use Bearer token → Validate JWT → Check RBAC → Check outlet scope

### Rate Limiting Configuration

| Endpoint Category | Limit | Window | Scope |
|-------------------|-------|--------|-------|
| Auth (login) | 5 requests | 15 minutes | Per IP |
| Auth (MFA) | 5 attempts | 5 minutes | Per user |
| Standard API (read) | 120 requests | 1 minute | Per user |
| Standard API (write) | 60 requests | 1 minute | Per user |
| POS transactions | 30 requests | 1 minute | Per terminal |
| File upload | 10 requests | 1 minute | Per user |
| Report generation | 5 requests | 5 minutes | Per user |

---

## 23. DEPLOYMENT & DOMAIN PLANNING

### Capstone Deployment Strategy

The development team plans to purchase a custom domain before deployment. The system must be deployment-ready for demonstration purposes and academic evaluation. This section provides practical deployment recommendations suitable for a capstone project.

### Environment Configuration

#### Environment Variables (.env)

All sensitive configuration must be stored in environment variables, never hardcoded. Create a `.env.example` file (committed to git) and a `.env` file (gitignored).

```env
# Application
APP_NAME="Restaurant Management System"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:6001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=rms_database
DB_USERNAME=postgres
DB_PASSWORD=

# Redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Authentication
JWT_SECRET=
JWT_EXPIRY=900
REFRESH_TOKEN_EXPIRY=604800

# Session & Cookie
SESSION_DRIVER=redis
SESSION_LIFETIME=120
SESSION_DOMAIN=localhost
SESSION_SECURE=false
SESSION_SAME_SITE=lax

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# File Storage
FILESYSTEM_DISK=local
UPLOAD_MAX_SIZE=10240

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=debug

# Reverse Proxy
TRUSTED_PROXIES=*
```

#### Separate Development and Production Configurations

| Setting | Development | Production |
|---------|-------------|------------|
| `APP_ENV` | `local` | `production` |
| `APP_DEBUG` | `true` | `false` |
| `APP_URL` | `http://localhost:3000` | `https://yourdomain.com` |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000/api/v1` | `https://api.yourdomain.com/v1` |
| `SESSION_SECURE` | `false` | `true` |
| `LOG_LEVEL` | `debug` | `warning` |
| `DB_HOST` | `127.0.0.1` | Production DB host |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | `https://yourdomain.com` |

#### Configurable API Base URL

The frontend must never hardcode `localhost` URLs. Use environment variables for all API endpoints:

```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = {
  get: (path: string) => fetch(`${API_BASE_URL}${path}`, { ... }),
  post: (path: string, data: unknown) => fetch(`${API_BASE_URL}${path}`, { ... }),
  // ...
};
```

#### Secure Database Credentials

- Never commit `.env` files to git
- Use environment variable injection in production (Vercel/Railway/Render dashboard)
- Use strong passwords (16+ characters, mixed case, symbols)
- Rotate credentials periodically
- Use separate database credentials for development and production

#### CORS Configuration

Configure CORS in the Laravel backend to allow only the frontend domain:

```php
// config/cors.php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

#### Authentication Compatibility After Deployment

- JWT tokens must work across domains (frontend and API on different subdomains)
- Set `SESSION_DOMAIN` to `.yourdomain.com` (with leading dot) for cross-subdomain cookies
- Ensure `SameSite` is set to `Lax` or `None` (with `Secure=true`) for cross-origin requests
- Test token refresh flow on the production URL before going live
- Update `NEXT_PUBLIC_API_BASE_URL` in Vercel/Railway environment variables

#### Session & Cookie Configuration

```php
// config/session.php (Production)
return [
    'driver' => env('SESSION_DRIVER', 'redis'),
    'lifetime' => env('SESSION_LIFETIME', 120),
    'expire_on_close' => false,
    'encrypt' => true,
    'files' => storage_path('framework/sessions'),
    'connection' => env('SESSION_CONNECTION'),
    'table' => 'sessions',
    'store' => env('SESSION_STORE'),
    'lottery' => [2, 100],
    'cookie' => env('SESSION_COOKIE', 'rms_session'),
    'path' => '/',
    'domain' => env('SESSION_DOMAIN', '.yourdomain.com'),
    'secure' => env('SESSION_SECURE', true),
    'http_only' => true,
    'same_site' => 'lax',
];
```

#### File Upload Strategy

| Aspect | Development | Production |
|--------|-------------|------------|
| Storage | Local filesystem | Cloud storage (S3, Cloudinary, or Vercel Blob) |
| Max Size | 10 MB | 10 MB |
| Allowed Types | jpg, png, webp, pdf | jpg, png, webp, pdf |
| Access | Direct file access | CDN-backed URLs |
| Menu Images | Local `/uploads/` | S3 bucket with CloudFront |
| Reports/PDFs | Generated locally | Generated and stored in cloud |

```env
# Production file storage
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=your-bucket-name
```

#### HTTPS Readiness

- Purchase SSL certificate (Let's Encrypt is free) or use platform-provided SSL
- Force HTTPS redirects in Laravel:
```php
// AppServiceProvider.php
if ($this->app->environment('production')) {
    \Illuminate\Support\Facades\URL::forceScheme('https');
}
```
- Ensure all API calls use `https://` in production
- Set `SESSION_SECURE=true` in production
- Update all `NEXT_PUBLIC_*` URLs to use `https://`

#### Reverse Proxy Compatibility (Nginx/Apache)

**Nginx Configuration (Recommended for VPS):**

```nginx
server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:6001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Laravel API
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Apache Configuration:**

```apache
<VirtualHost *:443>
    ServerName yourdomain.com
    SSLEngine on
    SSLCertificateFile /path/to/fullchain.pem
    SSLCertificateKeyFile /path/to/privkey.pem

    # Proxy to Next.js
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>

<VirtualHost *:443>
    ServerName api.yourdomain.com
    SSLEngine on

    # Proxy to Laravel
    ProxyPass / http://127.0.0.1:8000/
    ProxyPassReverse / http://127.0.0.1:8000/
</VirtualHost>
```

#### Database Migration Strategy

- Use Laravel migrations for all schema changes
- Never modify a committed migration — create a new one
- Run `php artisan migrate --force` in production (include `--force` to skip confirmation)
- Use seeders for initial data (roles, permissions, sample data)
- Test migrations on a copy of production data before deploying
- Keep migration files in version control

```bash
# Development
php artisan migrate:fresh --seed

# Production
php artisan migrate --force
```

#### Production Logging

```php
// config/logging.php
'channels' => [
    'stack' => [
        'driver' => 'stack',
        'channels' => ['daily', 'slack'],
        'ignore_exceptions' => false,
    ],
    'daily' => [
        'driver' => 'daily',
        'path' => storage_path('logs/laravel.log'),
        'level' => env('LOG_LEVEL', 'warning'),
        'days' => 30,
    ],
    'stderr' => [
        'driver' => 'monolog',
        'level' => env('LOG_LEVEL', 'debug'),
        'handler' => Monolog\Handler\StreamHandler::class,
    ],
],
```

- Log errors and warnings in production (not debug)
- Rotate logs daily, keep 30 days
- Use structured logging (JSON format) for production
- Monitor logs via platform dashboard (Vercel/Railway/Render)

#### Backup Strategy

| Component | Frequency | Method | Retention |
|-----------|-----------|--------|-----------|
| Database | Daily automated | pg_dump to cloud storage | 30 days |
| Database | Before each migration | Manual pg_dump | Until next backup |
| File uploads | Daily | S3 versioning / sync | 30 days |
| Environment config | On change | Manual backup (encrypted) | Current version |
| Git repository | Continuous | GitHub | Full history |

```bash
# Database backup script
pg_dump -U postgres -h localhost rms_database | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_20260723.sql.gz | psql -U postgres -h localhost rms_database
```

### Deployment Platform Comparison

| Platform | Best For | Backend | Frontend | Database | Free Tier | Custom Domain |
|----------|----------|---------|----------|----------|-----------|---------------|
| **VPS (DigitalOcean/Hetzner)** | Full control, all modules integrated | Docker | Docker/Nginx | PostgreSQL on VPS | No (starts ~$5/mo) | Yes |
| **Render** | Simple deployment, all-in-one | Docker or Build | Static/SSR | PostgreSQL (paid) | Limited | Yes (free SSL) |
| **Railway** | Quick setup, good DX | Docker or Build | Static/SSR | PostgreSQL add-on | $5 trial credit | Yes (free SSL) |
| **Vercel** | Frontend only (Next.js) | Serverless functions | Native Next.js | External DB needed | Generous | Yes (free SSL) |

### Recommended Deployment Approach

For a capstone project with multiple modules to integrate, the **VPS approach (DigitalOcean or Hetzner)** is the most practical:

**Why VPS is recommended:**
1. All modules (Restaurant, HRMS, Finance, Supply Chain, Hotel, Facilities) can run on a single server
2. Full control over PostgreSQL, Redis, Nginx configuration
3. No per-platform restrictions or vendor lock-in
4. Single domain with subdomains for each module
5. Cost-effective (~$5–12/month for a capstone demo)
6. Docker Compose makes multi-module deployment straightforward
7. Easier for the Lead Programmer to manage integration

**VPS Deployment Architecture:**

```
yourdomain.com                    (Frontend - Next.js)
├── api.yourdomain.com            (Laravel API - Restaurant)
├── api-hrms.yourdomain.com       (Laravel API - HRMS)
├── api-finance.yourdomain.com    (Laravel API - Finance)
├── ws.yourdomain.com             (WebSocket Server)
└── PostgreSQL (shared database)

Docker Compose Services:
├── nginx (reverse proxy + SSL)
├── restaurant-frontend (Next.js)
├── restaurant-backend (Laravel)
├── hrms-backend (Laravel)
├── finance-backend (Laravel)
├── shared-frontend (Unified UI)
├── postgres (database)
├── redis (cache + sessions)
└── soketi (WebSocket server)
```

**If VPS is not feasible**, use **Render** or **Railway** as the second-best option:
- Deploy each module as a separate service
- Use a hosted PostgreSQL add-on
- Configure environment variables per service
- Use the platform's built-in SSL and custom domain support

**If only the frontend is needed for demo**, use **Vercel**:
- Deploy the Next.js frontend on Vercel
- Deploy the Laravel backend on Render/Railway/VPS
- Connect frontend to backend via environment variables

### Pre-Deployment Checklist

- [ ] All `localhost` URLs replaced with environment variables
- [ ] `.env.example` committed with all required variables documented
- [ ] `.env` added to `.gitignore`
- [ ] CORS configured for production domain
- [ ] `SESSION_SECURE=true` in production
- [ ] `APP_DEBUG=false` in production
- [ ] `APP_URL` and `NEXT_PUBLIC_API_BASE_URL` updated
- [ ] Database migrations tested on production-like data
- [ ] SSL certificate installed and HTTPS forced
- [ ] Nginx/Apache configured with reverse proxy
- [ ] File uploads configured for cloud storage (or local with proper permissions)
- [ ] WebSocket server configured for WSS (secure WebSocket)
- [ ] Backup scripts scheduled
- [ ] Error logging configured and monitored
- [ ] All team members can access the deployed application

---

## 24. MODULE INTEGRATION GUIDELINES

This section provides guidelines for integrating the Restaurant Management System with other capstone modules. The Lead Programmer will merge all modules into a unified system. These guidelines ensure the Restaurant module can be integrated without major restructuring.

### Module Independence

- The Restaurant module must be fully functional as a standalone system before integration
- All Restaurant-specific logic, routes, models, and controllers must live within the `restaurant/` directory
- The module must not depend on code from other modules at compile/build time
- Runtime integration (API calls to other modules) is allowed and encouraged
- Each module should be able to run independently with its own development environment

### API-First Communication

- All inter-module communication must happen through REST APIs
- Each module exposes a well-documented API that other modules can consume
- No direct database access between modules (use API calls instead)
- All API endpoints must be versioned (`/api/v1/...`)
- Document all API endpoints using OpenAPI 3.0 / Swagger

### Shared Authentication Strategy

All modules must use the same authentication system:

| Aspect | Standard |
|--------|----------|
| Token Type | JWT (JSON Web Token) |
| Token Storage | HttpOnly secure cookies or Authorization header |
| Token Expiry | 15 minutes (access), 7 days (refresh) |
| User Identity | Shared `users` table in the common database |
| Role System | Shared `roles` and `permissions` tables |
| MFA | Optional, enforced at the application level |

The `shared/auth/` directory contains the authentication middleware that all modules must use. No module should implement its own authentication logic.

### Consistent Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Database tables | `snake_case` with module prefix | `rms_orders`, `hrms_employees` |
| Database columns | `snake_case` | `created_at`, `order_status` |
| API routes | `kebab-case` | `/api/v1/restaurant/menu-items` |
| API resource names | `plural nouns` | `/orders`, `/customers`, `/invoices` |
| PHP classes | `PascalCase` | `OrderController`, `MenuService` |
| PHP methods | `camelCase` | `getOrderById()`, `createInvoice()` |
| TypeScript components | `PascalCase` | `OrderCard`, `MenuGrid` |
| TypeScript functions | `camelCase` | `fetchOrders()`, `createOrder()` |
| Environment variables | `UPPER_SNAKE_CASE` | `DB_HOST`, `API_BASE_URL` |

### Standardized API Response Format

All modules must use the same response format:

**Success Response:**
```json
{
  "status": "success",
  "code": 200,
  "message": "Resource retrieved successfully",
  "data": { },
  "meta": {
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_pages": 15,
      "total_items": 287
    }
  }
}
```

**Error Response:**
```json
{
  "status": "error",
  "code": 422,
  "message": "Validation failed",
  "errors": {
    "field_name": ["Error message here"]
  }
}
```

**Common HTTP Status Codes:**
| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (soft delete) |
| 400 | Bad Request |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Server Error |

### Shared Identifiers

All modules must use consistent identifiers for shared entities:

| Entity | Identifier | Format | Example |
|--------|------------|--------|---------|
| User | `user_id` | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| Outlet | `outlet_id` | UUID v4 | `6ba7b810-9dad-11d1-80b4-00c04fd430c8` |
| Role | `role_id` | Integer or UUID | `1` or UUID |
| Timestamp | `*_at` | ISO 8601 | `2026-07-23T10:30:00Z` |

### Configuration Isolation

- Each module has its own `config/` directory for module-specific settings
- Shared configuration (database, Redis, auth) lives in the `shared/` directory
- Environment variables are prefixed by module where needed (e.g., `RMS_`, `HRMS_`, `FINANCE_`)
- No module should read another module's configuration files directly

### Environment Configuration

All modules share the same `.env` file in production but can have module-specific `.env.example` files:

```env
# Shared across all modules
DB_HOST=your-db-host
DB_PORT=5432
DB_DATABASE=capstone_db
REDIS_HOST=your-redis-host
JWT_SECRET=your-jwt-secret

# Restaurant module
RMS_DEFAULT_CURRENCY=PHP
RMS_TAX_RATE=0.12

# Other modules follow the same pattern
HRMS_PAYROLL_DAY=15
FINANCE_FISCAL_YEAR_START=01
```

### Error Handling

Each module must handle errors consistently:

- Use HTTP status codes correctly (not always returning 200)
- Log errors with context (module name, user, request ID)
- Return user-friendly error messages (not stack traces)
- Implement global exception handler in each module
- Use the shared error response format

```php
// Example: Laravel Exception Handler
public function register(): void
{
    $this->reportable(function (Throwable $e) {
        Log::error('Restaurant Module Error', [
            'module' => 'restaurant',
            'exception' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);
    });
}
```

### Logging

All modules must use the same logging format:

```json
{
  "timestamp": "2026-07-23T10:30:00Z",
  "level": "error",
  "module": "restaurant",
  "message": "Order creation failed",
  "context": {
    "user_id": "550e8400-...",
    "request_id": "req-abc-123",
    "order_data": { "..." }
  }
}
```

- Log levels: `debug`, `info`, `warning`, `error`, `critical`
- Production: `warning` and above
- Development: `debug` and above
- Include module name in all log entries
- Use structured logging (JSON format)

### Versioning

| Aspect | Convention |
|--------|------------|
| API Version | URL path: `/api/v1/restaurant/...` |
| Module Version | Semantic versioning in `README.md` (e.g., `v1.2.0`) |
| Breaking Changes | Always increment major version |
| Database Migrations | Sequential numbered files, never modify committed ones |
| Git Tags | Tag releases: `restaurant-v1.0.0` |

### Future Scalability

The module design should support these future enhancements without major refactoring:

- **Multi-outlet support**: Already designed with `outlet_id` on all tables
- **Multi-language**: Use translation tables (already in schema)
- **Multi-currency**: Use currency configuration table
- **Plugin system**: Design services with interfaces for easy extension
- **API versioning**: Already supports `/api/v1/`, `/api/v2/` pattern
- **Microservice extraction**: Modules can be deployed independently if needed

### Merge Conflict Prevention

| Practice | Description |
|----------|-------------|
| Own your directory | Each team works only in their module directory |
| Shared code in `shared/` | Changes to shared code require Lead Programmer approval |
| Database migrations | Each module prefixes tables (e.g., `rms_*`, `hrms_*`) |
| Route prefixes | Each module uses unique route prefixes |
| Git branching | Use feature branches, merge to `develop`, then `main` |
| Communication | Weekly sync meetings with Lead Programmer |
| API contracts | Document API contracts before implementation |

### Folder Organization Summary

| Directory | Owner | Purpose |
|-----------|-------|---------|
| `restaurant/` | Restaurant Team | All Restaurant module code |
| `hrms/` | HRMS Team | All HRMS module code |
| `finance/` | Finance Team | All Finance module code |
| `supply-chain/` | SCM Team | All Supply Chain module code |
| `hotel/` | Hotel Team | All Hotel module code |
| `facilities/` | Facilities Team | All Facilities module code |
| `shared/` | Lead Programmer | Shared auth, types, utils, API standards |

### Reusable Components

The following components should be built once and shared across modules:

| Component | Location | Used By |
|-----------|----------|---------|
| Login/Auth pages | `shared/auth/` | All modules |
| Navigation sidebar | `shared/layout/` | All modules |
| Data tables | `shared/ui/` | All modules |
| Form components | `shared/ui/` | All modules |
| Charts/Graphs | `shared/charts/` | All modules |
| Toast notifications | `shared/ui/` | All modules |
| Modal dialogs | `shared/ui/` | All modules |
| Date/Time pickers | `shared/ui/` | All modules |

### Shared Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| API client | `shared/utils/api.ts` | HTTP client with auth headers |
| Date formatting | `shared/utils/date.ts` | Consistent date display |
| Currency formatting | `shared/utils/currency.ts` | Consistent money display |
| Validation helpers | `shared/utils/validate.ts` | Form validation rules |
| Error handling | `shared/utils/error.ts` | Standardized error display |
| Auth helpers | `shared/utils/auth.ts` | Token management, role checks |

---

## 25. DEVELOPMENT ROADMAP

### Capstone Timeline: 12–16 Weeks

**Development Team:** 4–6 Student Developers

This roadmap is designed for an undergraduate capstone project, not a commercial software company. It accounts for academic schedules, learning curves, and the need for documentation and defense preparation.

### Phase 1: Planning & Analysis (Weeks 1–2)

**Objectives:**
- Finalize requirements and scope
- Set up development environment
- Establish team workflows and conventions

**Deliverables:**
- [ ] Requirements document (this document)
- [ ] Database schema design (ERD)
- [ ] API endpoint catalog
- [ ] UI wireframes / mockups
- [ ] Git repository setup with folder structure
- [ ] Docker Compose development environment
- [ ] Team communication channels (Slack/Discord)
- [ ] Git branching strategy documented

**Weekly Milestones:**
- Week 1: Team kickoff, requirements review, tool setup
- Week 2: Database design complete, API catalog complete, wireframes complete

**Testing Activities:**
- Verify Docker Compose environment works for all team members
- Set up CI pipeline (GitHub Actions) for automated testing

**Documentation Tasks:**
- System Requirements Document (SRD)
- Use Case Diagrams
- Activity Diagrams

---

### Phase 2: System Design (Weeks 3–4)

**Objectives:**
- Complete system architecture
- Design database schema
- Define API contracts

**Deliverables:**
- [ ] System architecture document
- [ ] Database migrations (all tables)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] UI component library setup (shadcn/ui)
- [ ] Authentication system design
- [ ] Shared component specifications

**Weekly Milestones:**
- Week 3: Database migrations created and tested, API docs started
- Week 4: API docs complete, UI scaffolding complete, auth flow designed

**Testing Activities:**
- Database migration testing (fresh install and rollbacks)
- API documentation review with all team members
- UI component library verification

**Documentation Tasks:**
- Detailed System Design Document
- Database Schema Documentation
- API Documentation (Swagger)

---

### Phase 3: Backend Development (Weeks 5–8)

**Objectives:**
- Build core backend functionality
- Implement all API endpoints
- Set up authentication and authorization

**Deliverables:**
- [ ] Authentication system (JWT + refresh tokens)
- [ ] User and role management
- [ ] Menu management API
- [ ] Customer and table management API
- [ ] Order management API
- [ ] KOT system API
- [ ] POS and billing API
- [ ] Inventory management API
- [ ] Staff management API
- [ ] Dashboard and reports API
- [ ] Audit logging system

**Weekly Milestones:**
- Week 5: Auth system, user management, menu CRUD
- Week 6: Customer/table management, order creation
- Week 7: KOT system, POS/billing, payment processing
- Week 8: Inventory, staff, reports, admin APIs

**Testing Activities:**
- Unit tests for all services and models
- API endpoint testing (Postman/Insomnia collections)
- Integration tests for critical flows (order → KOT → payment)
- Database query performance testing

**Documentation Tasks:**
- API endpoint documentation (auto-generated from code)
- Database migration notes
- Backend setup guide

---

### Phase 4: Frontend Development (Weeks 7–11)

**Objectives:**
- Build all user interface screens
- Implement real-time features (WebSocket)
- Create responsive layouts

**Deliverables:**
- [ ] Login and authentication pages
- [ ] Dashboard with widgets
- [ ] Menu management interface
- [ ] Customer management interface
- [ ] Table/floor plan management
- [ ] Order creation and management
- [ ] Kitchen display system (KDS)
- [ ] POS terminal interface
- [ ] Inventory management screens
- [ ] Staff management screens
- [ ] Reports and analytics pages
- [ ] Admin settings pages
- [ ] WebSocket integration for real-time updates

**Weekly Milestones:**
- Week 7: Auth pages, dashboard, layout components
- Week 8: Menu, customer, table management screens
- Week 9: Order creation, KDS, POS interface
- Week 10: Inventory, staff screens
- Week 11: Reports, admin, settings, real-time integration

**Testing Activities:**
- Component unit tests
- Responsive design testing (mobile, tablet, desktop)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- WebSocket connection testing
- Accessibility testing (WCAG 2.1 basics)

**Documentation Tasks:**
- Frontend setup guide
- Component storybook (if time permits)
- User interface screenshots for documentation

---

### Phase 5: Module Integration (Weeks 10–12)

**Objectives:**
- Integrate Restaurant module with other capstone modules
- Set up shared authentication
- Test cross-module workflows

**Deliverables:**
- [ ] Shared authentication system working across modules
- [ ] Restaurant API accessible from other modules
- [ ] Other module APIs accessible from Restaurant
- [ ] Unified frontend shell (navigation between modules)
- [ ] Cross-module data flow verified
- [ ] Integration test suite

**Weekly Milestones:**
- Week 10: Shared auth setup, API integration testing
- Week 11: Unified frontend shell, cross-module navigation
- Week 12: Integration testing, bug fixes, data flow verification

**Testing Activities:**
- End-to-end integration tests (cross-module flows)
- Authentication flow testing (login → access all modules)
- API contract testing between modules
- Database shared table testing

**Documentation Tasks:**
- Integration guide for Lead Programmer
- Module API contract documentation
- Cross-module workflow diagrams

---

### Phase 6: Testing (Weeks 11–13)

**Objectives:**
- Comprehensive testing of all features
- Performance testing
- Security testing

**Deliverables:**
- [ ] Complete unit test suite (80%+ coverage)
- [ ] Integration test suite
- [ ] End-to-end test suite (critical paths)
- [ ] Performance test results
- [ ] Security audit checklist
- [ ] Bug fix completion report

**Weekly Milestones:**
- Week 11: Unit and integration tests complete
- Week 12: E2E tests, performance testing
- Week 13: Security testing, bug fixes, regression testing

**Testing Activities:**
- Unit tests (target 80% code coverage)
- Integration tests (API endpoints, database)
- E2E tests (Playwright/Cypress for critical user flows)
- Performance testing (load testing with 50+ concurrent users)
- Security testing (OWASP Top 10 checklist)
- Mobile responsiveness testing
- Cross-browser compatibility testing

**Documentation Tasks:**
- Test plan document
- Test execution reports
- Bug tracking and resolution log

---

### Phase 7: Documentation (Weeks 12–14)

**Objectives:**
- Complete all project documentation
- Prepare presentation materials
- Write user guides

**Deliverables:**
- [ ] Final System Design Document
- [ ] Database Schema Documentation
- [ ] API Documentation (complete)
- [ ] User Manual (per role: Admin, Manager, Server, Kitchen, Cashier)
- [ ] Installation and Setup Guide
- [ ] Deployment Guide
- [ ] Technical Documentation
- [ ] Presentation slides
- [ ] Demo script and walkthrough

**Weekly Milestones:**
- Week 12: Technical documentation draft
- Week 13: User manual, deployment guide, presentation draft
- Week 14: Final documentation review, presentation rehearsal

**Documentation Tasks:**
- Finalize all documentation
- Record demo videos (if needed)
- Create presentation slides
- Prepare defense Q&A material

---

### Phase 8: Deployment & Defense Preparation (Weeks 13–16)

**Objectives:**
- Deploy to production
- Prepare for capstone defense
- Final polish and rehearsal

**Deliverables:**
- [ ] Production deployment on VPS/platform
- [ ] Custom domain configured with SSL
- [ ] All modules integrated and working in production
- [ ] Demo environment ready
- [ ] Defense presentation finalized
- [ ] Demo script rehearsed
- [ ] Backup strategy implemented
- [ ] Monitoring and error tracking active

**Weekly Milestones:**
- Week 13: VPS setup, Docker deployment, SSL configuration
- Week 14: Production testing, custom domain setup, final integration
- Week 15: Demo rehearsal, documentation finalization, bug fixes
- Week 16: Final deployment, defense preparation, presentation

**Testing Activities:**
- Production smoke testing
- Full regression testing on production
- Performance validation on production
- Security validation on production

**Documentation Tasks:**
- Deployment runbook
- Production architecture diagram
- Defense presentation
- Final project report

---

### Roadmap Summary

| Phase | Weeks | Focus | Team Size |
|-------|-------|-------|-----------|
| Phase 1: Planning & Analysis | 1–2 | Requirements, setup | All (4–6) |
| Phase 2: System Design | 3–4 | Architecture, DB, API | All (4–6) |
| Phase 3: Backend Development | 5–8 | API, business logic | 3–4 backend devs |
| Phase 4: Frontend Development | 7–11 | UI, components, real-time | 2–3 frontend devs |
| Phase 5: Module Integration | 10–12 | Cross-module integration | All (4–6) |
| Phase 6: Testing | 11–13 | QA, performance, security | All (4–6) |
| Phase 7: Documentation | 12–14 | Docs, presentation | All (4–6) |
| Phase 8: Deployment & Defense | 13–16 | Deploy, rehearse | All (4–6) |

**Note:** Phases overlap intentionally. Backend and frontend development run in parallel. Documentation starts during development. Testing begins as features are completed.

### Weekly Schedule Template

| Day | Activity |
|-----|----------|
| Monday | Sprint planning, task assignment |
| Tue–Thu | Development (coding, testing) |
| Friday | Code review, sprint demo, retrospective |

### Risk Management

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | High | High | Strict adherence to requirements document |
| Team member unavailability | Medium | High | Cross-training, documentation, shared codebase |
| Integration conflicts | Medium | High | Regular sync, shared auth, API contracts |
| Deployment issues | Medium | Medium | Test deployment early (Week 8), use Docker |
| Performance issues | Low | Medium | Early load testing, query optimization |
| Data loss | Low | High | Daily backups, version control, test migrations |

---

## 26. TESTING STRATEGY

### Testing Pyramid
- **Unit Tests (70%)**: Services, models, utilities, components, hooks
- **Integration Tests (20%)**: API endpoints, DB integration, auth, WebSocket, queue jobs
- **E2E Tests (10%)**: Critical user journeys (auth, order, POS, inventory, reservation, staff, reports)

### Test Counts (Estimated)
- Laravel Unit Tests: 740+
- Next.js Unit Tests: 300+
- Integration Tests: 370+
- E2E Tests: 15 flows

### Performance Testing
- Load testing: 500 concurrent users, <200ms p95
- POS transactions: <500ms per payment
- WebSocket: 1000 concurrent connections
- Database: 10,000 queries/sec

### Security Testing
- SAST: PHPStan, ESLint security rules (every commit)
- DAST: OWASP ZAP (weekly scan)
- Dependency scanning: Dependabot / Snyk (daily)
- Container scanning: Trivy (every build)
- Penetration testing: Pre-launch, quarterly

---

## 27. DOCUMENTATION PLAN

### Documentation Categories
1. **Technical**: Architecture docs, API docs (OpenAPI 3.0), DB schema, Deployment guide, Security architecture, Integration guide
2. **User**: User manuals per role (Admin, Manager, Server, Kitchen, Cashier), Quick start guides, Feature walkthroughs, Troubleshooting, FAQ
3. **Operations**: Operations manual, Monitoring guide, Backup/recovery, Scaling guide, Incident response playbook, Runbook
4. **Development**: Contributing guidelines, Code style guide, Git workflow, Code review checklist, Release notes, Developer onboarding
5. **Training**: Training videos, Interactive tutorials, Workshop materials

### Documentation Timeline
- Phase 1: Architecture docs, setup guide, DB schema, API spec v1
- Phase 2: API spec updated, initial user guides
- Phase 3: POS user guide, payment integration guide
- Phase 4: Inventory guide, staff management guide
- Phase 5: Report guide, dashboard guide
- Phase 6: ERP integration guide, third-party API docs
- Phase 7: Full documentation review, training materials, operations manual

---

*End of System Design Document*
