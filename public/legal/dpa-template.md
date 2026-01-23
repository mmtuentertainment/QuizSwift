# Data Processing Agreement (DPA) Template

**QuizSwift - Educational Technology Services**

Version 1.0
Effective Date: [INSERT DATE]

---

## 1. Introduction

This Data Processing Agreement ("DPA") is entered into between:

**Data Controller:** [School/District Name] ("School")
**Data Processor:** QuizSwift ("Provider")

This DPA supplements and forms part of the Terms of Service between the School and Provider for the QuizSwift educational assessment platform.

---

## 2. Definitions

**"Personal Data"** means any information relating to an identified or identifiable natural person, including students and educators.

**"Student Data"** means Personal Data directly related to a student that is collected, maintained, or used by the School or Provider in connection with education services.

**"Education Records"** has the meaning ascribed to it in the Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. Section 1232g.

**"COPPA"** means the Children's Online Privacy Protection Act, 15 U.S.C. Section 6501 et seq.

**"Processing"** means any operation performed on Personal Data, including collection, recording, organization, storage, adaptation, retrieval, use, disclosure, or erasure.

---

## 3. Scope of Processing

### 3.1 Categories of Data Subjects

- Students (including students under 13 years of age)
- Teachers and school staff
- School administrators

### 3.2 Types of Personal Data Processed

| Category | Data Elements | Purpose |
|----------|---------------|---------|
| Account Information | Email address, name, profile picture (from Google OAuth) | User authentication and identification |
| Quiz Performance | Quiz responses, scores, completion timestamps | Educational assessment and progress tracking |
| Uploaded Content | Textbook excerpts, educational materials | Quiz question extraction |
| Usage Logs | Login timestamps, IP addresses, user agent | Security monitoring and compliance auditing |

### 3.3 Processing Purposes

Provider shall process Personal Data solely for:

1. Providing the educational assessment platform services
2. Authenticating users via Google OAuth
3. Generating quiz questions from teacher-provided materials
4. Recording and reporting assessment results
5. Maintaining audit logs for FERPA compliance
6. Providing technical support to the School

---

## 4. FERPA Compliance

### 4.1 School Official Designation

The School designates Provider as a "school official" with a "legitimate educational interest" under FERPA (34 CFR Section 99.31(a)(1)).

### 4.2 Provider Obligations

Provider agrees to:

a) Use Education Records solely for the purposes authorized by the School
b) Not disclose Education Records to third parties without consent
c) Not use Education Records for any commercial purpose other than providing services
d) Maintain security measures appropriate for Education Records
e) Return or destroy Education Records upon contract termination

### 4.3 Audit Trail

Provider maintains comprehensive audit logs that record:
- All data access events
- All data modifications (create, update, delete)
- Actor identification (user performing the action)
- Timestamp of all operations
- IP address and user agent information

These logs are retained for [7 years] and are available to the School upon request.

---

## 5. COPPA Compliance

### 5.1 Children Under 13

Provider acknowledges that students under 13 years of age may use the platform and commits to full COPPA compliance.

### 5.2 Consent

The School represents that it has obtained any required consent from parents/guardians for the collection and use of Personal Data from students under 13, or that such consent is not required under the "school exception" to COPPA.

### 5.3 Data Minimization

Provider collects only the minimum Personal Data necessary to provide the educational services:
- Google OAuth profile (email, name, profile picture)
- Quiz responses and performance data
- No additional data collection from children without explicit consent

### 5.4 Parental Rights

Upon School request, Provider shall:
- Provide access to a child's Personal Data
- Delete a child's Personal Data within 30 days
- Cease further collection from a specific child

### 5.5 Data Retention

Personal Data from students under 13 shall be:
- Retained only as long as necessary for the educational purpose
- Deleted within 30 days of account deletion request
- Deleted within 90 days of contract termination

---

## 6. Data Security

### 6.1 Technical Measures

Provider implements the following security measures:

| Measure | Implementation |
|---------|----------------|
| Encryption in Transit | TLS 1.3 for all communications |
| Encryption at Rest | AES-256 database encryption |
| Authentication | OAuth 2.0 with secure token handling |
| Session Management | Database-stored sessions with expiration |
| Access Control | Role-based access control (RBAC) |
| Audit Logging | Immutable audit trail of all data operations |

### 6.2 Organizational Measures

Provider maintains:
- Documented security policies and procedures
- Employee training on data protection
- Background checks for personnel with data access
- Incident response procedures

---

## 7. Data Subject Rights

### 7.1 Access and Portability

Provider shall assist the School in responding to requests from data subjects (students, parents, educators) to access their Personal Data.

### 7.2 Deletion (Right to Erasure)

Upon request, Provider shall:
- Anonymize user data within 30 days (soft delete preserving referential integrity)
- Delete OAuth tokens immediately
- Terminate all active sessions
- Log the deletion request in the audit trail

### 7.3 Correction

Provider shall assist the School in correcting inaccurate Personal Data upon request.

---

## 8. Data Breach Notification

### 8.1 Definition

A "Data Breach" means unauthorized access, acquisition, use, or disclosure of Personal Data that compromises the security, confidentiality, or integrity of the data.

### 8.2 Notification Timeline

Provider shall notify the School of any Data Breach:
- Within 72 hours of becoming aware of the breach
- By email to the designated School contact
- With a summary of known facts, affected data categories, and remediation steps

### 8.3 Cooperation

Provider shall cooperate with the School's investigation and notification obligations.

---

## 9. Subprocessors

### 9.1 Current Subprocessors

| Subprocessor | Service | Data Access | Location |
|--------------|---------|-------------|----------|
| [Database Provider] | Database hosting | All application data | United States |
| [Hosting Provider] | Application hosting | All application data | United States |
| Google | OAuth authentication | Email, name, profile picture | United States |

### 9.2 Changes to Subprocessors

Provider shall:
- Maintain a list of authorized subprocessors
- Notify the School 30 days before adding new subprocessors
- Ensure all subprocessors agree to equivalent data protection obligations

---

## 10. Data Transfer

### 10.1 Geographic Restrictions

Personal Data shall be stored and processed only within the United States unless the School provides written consent for other locations.

### 10.2 Cross-Border Transfers

Any cross-border transfer shall comply with applicable data protection laws and appropriate safeguards.

---

## 11. Retention and Deletion

### 11.1 Active Account Retention

Personal Data is retained while the School's account remains active and as necessary to provide services.

### 11.2 Post-Termination

Upon contract termination:
- Provider shall delete or return all Personal Data within 90 days
- School may request data export before deletion
- Audit logs may be retained for compliance purposes (anonymized)

### 11.3 Deletion Verification

Upon request, Provider shall certify in writing that deletion has been completed.

---

## 12. School Obligations

The School agrees to:

a) Obtain necessary consents for data processing
b) Provide accurate information about authorized users
c) Promptly notify Provider of data subject requests
d) Comply with applicable data protection laws
e) Use the services only for educational purposes

---

## 13. Limitation of Liability

Data protection liability shall be governed by the Terms of Service, subject to applicable law.

---

## 14. Term and Termination

### 14.1 Term

This DPA remains in effect for the duration of the Terms of Service.

### 14.2 Survival

Sections 4 (FERPA), 5 (COPPA), 6 (Security), 8 (Breach Notification), and 11 (Retention/Deletion) survive termination.

---

## 15. Amendments

Provider may update this DPA to reflect changes in data protection laws or practices. Material changes require 30 days notice to the School.

---

## 16. Contact Information

**For Data Protection Inquiries:**

QuizSwift Data Protection Officer
Email: privacy@quizswift.com
Address: [INSERT ADDRESS]

**School Data Protection Contact:**

Name: ________________________
Email: ________________________
Phone: ________________________

---

## Signature Block

**FOR THE SCHOOL:**

Signature: ________________________
Name: ________________________
Title: ________________________
Date: ________________________

**FOR PROVIDER:**

Signature: ________________________
Name: ________________________
Title: ________________________
Date: ________________________

---

## Appendix A: Technical and Organizational Measures

### A.1 Access Control

- Unique user identification via Google OAuth
- Role-based access control (student, teacher, admin)
- Automatic session expiration
- No shared accounts or credentials

### A.2 Encryption

- TLS 1.3 for all data in transit
- AES-256 encryption for data at rest
- Secure key management practices

### A.3 Availability

- Regular automated backups
- Disaster recovery procedures
- Uptime monitoring and alerting

### A.4 Audit and Logging

- Immutable audit trail of all data operations
- Log retention for 7 years
- Regular security audits
- Penetration testing (annual)

---

## Appendix B: Data Deletion Procedures

### B.1 User Deletion Request Process

1. School submits deletion request via admin interface or email
2. Provider verifies request authenticity
3. Within 30 days:
   - User account is anonymized (email, name, profile picture removed)
   - OAuth tokens are deleted
   - Active sessions are terminated
   - Audit log entry is created
4. Provider confirms deletion to School

### B.2 Contract Termination Process

1. School notifies Provider of contract termination
2. Within 30 days, School may request data export
3. Within 90 days of termination:
   - All Personal Data is deleted or anonymized
   - Provider certifies deletion in writing

---

*This template is provided for reference purposes. Schools should review with legal counsel before execution.*
