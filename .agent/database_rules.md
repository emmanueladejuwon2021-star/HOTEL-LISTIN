# TURSO LIBSQL DATABASE & QUERY STANDARDS
## UNILAG HOSTEL MANAGEMENT APP ('UnilagStay')

---

### 1. STRICT DDL SCHEMA COMPLIANCE
All database tables must strictly match the schema specified in `PRD.md` Section 9:
- `users` (id, matric_or_staff_no, full_name, email, phone_number, role, gender, profile_photo_url, is_active, created_at)
- `student_profiles` (user_id, faculty, department, level, campus, priority_category, fees_paid, clearance_status)
- `hostels` (id, name, gender, campus, category, total_capacity, available_bedspaces)
- `rooms` (id, hostel_id, block_name, floor_number, room_number, total_beds, occupied_beds)
- `bedspaces` (id, room_id, bed_label, status, allocated_to_user_id, hold_expires_at, updated_at)
- `payments` (id, user_id, bedspace_id, transaction_reference, amount, payment_status, paid_at)
- `room_inventory_audits` (id, room_id, student_id, porter_id, mattress_condition, fan_condition, sockets_condition, locks_condition, signatures)
- `maintenance_tickets` (id, student_id, hostel_id, room_number, category, description, photo_before_url, photo_after_url, status, assigned_artisan_id)
- `visitor_passes` (id, student_id, visitor_name, visitor_phone, pass_code, visit_date, check_in_time, check_out_time, status)
- `exeat_requests` (id, student_id, destination_address, reason, departure_date, return_date, warden_approval_status, warden_id)
- `emergency_alerts` (id, student_id, hostel_id, room_number, alert_type, status, created_at)

---

### 2. INDEXING & QUERY OPTIMIZATION
- Mandatory Indexes: `idx_users_matric`, `idx_bedspaces_status`, `idx_maintenance_status`, `idx_visitor_pass_code`.
- Always use parameterized SQL statements (`db.execute({ sql: '...', args: [...] })`) to prevent SQL injection.

---

*End of Database Rules (.agent/database_rules.md)*