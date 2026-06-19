# SmartFee - Hệ thống Quản lý Học phí

## 1. Concept & Vision

**SmartFee** là nền tảng quản lý học phí thông minh, được thiết kế cho các trung tâm và lớp học tại Việt Nam. Giao diện mang phong cách hiện đại với màu xanh chủ đạo tượng trưng cho sự tin cậy và chuyên nghiệp. Ứng dụng mang lại trải nghiệm quản lý tài chính liền mạch, từ theo dõi công nợ đến thu học phí tự động qua QR code.

## 2. Design Language

### Color Palette
- **Primary**: `#2563EB` (Royal Blue - đáng tin cậy, chuyên nghiệp)
- **Primary Light**: `#3B82F6`
- **Primary Dark**: `#1D4ED8`
- **Secondary**: `#10B981` (Emerald - thành công, thanh toán)
- **Accent**: `#F59E0B` (Amber - cảnh báo, chờ xử lý)
- **Danger**: `#EF4444` (Red - lỗi, quá hạn)
- **Background**: `#F8FAFC`
- **Surface**: `#FFFFFF`
- **Text Primary**: `#1E293B`
- **Text Secondary**: `#64748B`
- **Border**: `#E2E8F0`

### Typography
- **Headings**: Inter (700, 600)
- **Body**: Inter (400, 500)
- **Monospace**: JetBrains Mono (số liệu, mã)
- **Vietnamese Support**: Full

### Spatial System
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px
- Border radius: 8px (cards), 6px (buttons), 4px (inputs)
- Shadow: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`

### Motion Philosophy
- Transitions: 150ms ease-out (hover), 200ms ease-out (modals)
- Page transitions: fade + slide up, 300ms
- Loading: skeleton pulse animation
- Micro-interactions: scale 1.02 on card hover

## 3. Layout & Structure

### Main Layout
```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo | Search | Notifications | User Menu      │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Sidebar  │              Main Content                    │
│ - Dashboard                                            │
│ - Học sinh│                                             │
│ - Lớp học │                                             │
│ - Học phí │                                             │
│ - Thu chi │                                             │
│ - Báo cáo│                                              │
│ - Settings│                                             │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Responsive Strategy
- Desktop: Full sidebar + content
- Tablet: Collapsible sidebar
- Mobile: Bottom navigation

## 4. Features & Interactions

### Authentication & Onboarding
- Login/Register với email/password
- Quên mật khẩu qua email
- Đăng nhập một lần (SSO) cho tương lai
- Multi-tenant: mỗi trung tâm là một tenant riêng

### Dashboard
- Tổng quan tài chính: Thu hôm nay, tuần này, tháng này
- Biểu đồ doanh thu theo tháng (12 tháng)
- Top 5 lớp có công nợ cao nhất
- Thông báo: Học sinh sắp hết hạn, thanh toán đến hạn
- Quick actions: Thu tiền, thêm học sinh, tạo báo cáo

### Quản lý Học sinh
- CRUD học sinh đầy đủ
- Import từ Excel
- Lọc theo lớp, trạng thái (đang học, nghỉ, tốt nghiệp)
- Thông tin: Tên, ngày sinh, PHHS, SĐT, địa chỉ, ảnh
- Lịch sử thanh toán của từng học sinh
- Ghi chú riêng

### Quản lý Lớp học
- CRUD lớp học
- Phân công giáo viên
- Học phí theo lớp
- Sĩ số hiện tại
- Lịch học (thứ, giờ)

### Quản lý Học phí
- **Kỳ học phí**: Tạo kỳ thu (tháng, quý, học kỳ)
- **Mức học phí**: Theo lớp, theo học sinh (miễn giảm)
- **Danh sách thu**: Xem ai chưa đóng, đã đóng, quá hạn
- **Gửi nhắc nợ**: Email, SMS (tích hợp SendGrid, Twilio)
- **Thu tiền**: Ghi nhận thanh toán, in phiếu thu

### Thanh toán
- Tạo QR code thanh toán (VNPay integration)
- Hỗ trợ: ATM, Visa, Ví điện tử, Chuyển khoản
- Xác nhận thanh toán tự động qua webhook
- Ví điện tử: Số dư có thể nạp trước

### Báo cáo
- Báo cáo doanh thu theo ngày/tháng/năm
- Báo cáo công nợ
- Báo cáo theo lớp
- Xuất Excel, PDF
- Dashboard analytics cho Premium

### Settings
- Thông tin trung tâm (tên, logo, địa chỉ)
- Cấu hình SMTP để gửi email
- Cấu hình SMS (nếu có)
- Quản lý nhân viên & phân quyền
- Múi giờ, định dạng tiền tệ

## 5. Pricing Tiers

### Basic (Miễn phí)
- 100 học sinh tối đa
- 4 lớp học
- 2 người dùng
- Báo cáo hàng tháng
- Lịch sử 3 tháng

### Gold (299.000đ/tháng)
- 350 học sinh
- Không giới hạn lớp học
- 5 người dùng
- Nhắc nhở qua Gmail/SMS
- QR tĩnh cho mỗi học sinh
- Lịch sử 1 năm

### Premium (799.000đ/tháng)
- Không giới hạn học sinh
- Không giới hạn lớp học
- Không giới hạn người dùng
- QR động (bảo mật cao)
- Ví điện tử (nạp tiền trước)
- Nhắc nhở tự động theo lịch
- Analytics nâng cao
- Lịch sử vô thời hạn

## 6. Component Inventory

### Buttons
- Primary: bg-blue-600, hover:bg-blue-700, text-white
- Secondary: bg-gray-100, hover:bg-gray-200, text-gray-700
- Danger: bg-red-600, hover:bg-red-700, text-white
- Ghost: border, hover:bg-gray-50
- Loading state: spinner + disabled

### Cards
- Background white, border gray-200
- Shadow-sm, hover:shadow
- Header với title + actions
- Padding: 24px

### Tables
- Striped rows
- Sticky header
- Row hover highlight
- Pagination
- Sort indicators
- Empty state

### Forms
- Floating labels
- Validation inline
- Error state: red border + message
- Success state: green border + checkmark

### Modals
- Backdrop blur
- Slide up + fade
- Close on ESC/backdrop click
- Focus trap

### Sidebar
- Active item: bg-blue-50, border-left-blue
- Collapsible
- Smooth transitions

### Notifications/Toasts
- Success: green
- Error: red
- Warning: amber
- Info: blue
- Auto-dismiss 5s, manual dismiss

## 7. Technical Approach

### Backend (Node.js + Express)
```
/server
  /src
    /config          # Database, env config
    /controllers     # Route handlers
    /models          # Mongoose schemas
    /middleware      # Auth, validation, error handling
    /routes          # API routes
    /services        # Business logic
    /utils           # Helpers
    /jobs            # Cron jobs (reminders)
```

### API Design
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/forgot-password
GET    /api/auth/me

GET    /api/students
POST   /api/students
POST   /api/students/bulk
POST   /api/students/import
GET    /api/students/:id
PUT    /api/students/:id
DELETE /api/students/:id
GET    /api/students/stats/count

GET    /api/classes
POST   /api/classes
GET    /api/classes/:id
PUT    /api/classes/:id
DELETE /api/classes/:id
POST   /api/classes/:id/students/:studentId
DELETE /api/classes/:id/students/:studentId

GET    /api/fees
POST   /api/fees
GET    /api/fees/:id
PUT    /api/fees/:id
POST   /api/fees/generate
POST   /api/fees/bulk-update
POST   /api/fees/:id/discount

GET    /api/payments
POST   /api/payments
POST   /api/payments/qr-code
POST   /api/payments/wallet/topup
POST   /api/payments/wallet/pay
POST   /api/webhooks/vnpay

GET    /api/reports/revenue
GET    /api/reports/debt
GET    /api/reports/class
GET    /api/reports/student/:id

GET    /api/settings
PUT    /api/settings
GET    /api/settings/usage
GET    /api/settings/plans
POST   /api/settings/upgrade/payos
POST   /api/settings/upgrade/confirm
POST   /api/settings/cancel
POST   /api/webhooks/payos
GET    /api/settings/staff
POST   /api/settings/staff
PUT    /api/settings/staff/:id
DELETE /api/settings/staff/:id

GET    /api/dashboard/stats
GET    /api/dashboard/recent-payments
GET    /api/dashboard/top-debtors
GET    /api/dashboard/revenue-chart
GET    /api/dashboard/fee-distribution
```

### Data Models

**Organization** (Tenant)
```javascript
{
  _id, name, logo, address, phone,
  plan: 'basic' | 'gold' | 'premium',
  planExpiresAt: Date,
  planWillDowngrade: String (nullable),
  settings: { currency, timezone, smtp },
  isActive: Boolean,
  createdAt, updatedAt
}
```

**User** (với vai trò: admin, staff, viewer, family)
```javascript
{
  _id, organizationId, email, password (hashed),
  name, phone, role: 'admin' | 'staff' | 'viewer' | 'family',
  studentId: ObjectId (nullable, cho family),
  childIds: [ObjectId] (cho family),
  permissions: [String],
  isActive: Boolean, lastLogin: Date,
  googleId: String (nullable),
  avatar: String,
  createdAt, updatedAt
}
```

**Student**
```javascript
{
  _id, organizationId, studentId (auto),
  name, dob, gender, avatar,
  parentName, parentPhone, parentEmail,
  address, classIds: [], status: 'active' | 'inactive' | 'graduated',
  notes, walletBalance,
  createdAt, updatedAt
}
```

**Class**
```javascript
{
  _id, organizationId, name, code,
  teacherId, description, schedule: [{ day, startTime, endTime }],
  maxStudents, currentStudents,
  feeAmount, status: 'active' | 'inactive',
  createdAt, updatedAt
}
```

**FeePeriod** (Kỳ thu học phí)
```javascript
{
  _id, organizationId, name, periodType: 'month' | 'quarter' | 'semester',
  startDate, endDate, dueDate,
  status: 'draft' | 'active' | 'closed',
  createdAt, updatedAt
}
```

**Fee**
```javascript
{
  _id, organizationId, studentId, classId, feePeriodId,
  amount, discount, finalAmount,
  status: 'unpaid' | 'partial' | 'paid' | 'overdue',
  paidAmount, paidAt,
  createdAt, updatedAt
}
```

**Payment**
```javascript
{
  _id, organizationId, studentId, feeId,
  amount, paymentMethod: 'cash' | 'banking' | 'vnpay' | 'wallet',
  transactionId, vnpayTxnRef,
  status: 'pending' | 'success' | 'failed',
  paidAt, notes,
  createdAt, updatedAt
}
```

**Notification**
```javascript
{
  _id, organizationId, studentId,
  type: 'reminder' | 'payment' | 'alert',
  channel: 'email' | 'sms',
  status: 'pending' | 'sent' | 'failed',
  sentAt,
  createdAt
}
```

### Frontend (React + Vite)
```
/client
  /src
    /components     # Reusable UI components
    /pages          # Route pages
    /hooks          # Custom hooks
    /context        # React context (Auth, Theme)
    /services       # API calls
    /utils          # Helpers
    /styles         # Global styles
```

### State Management
- React Context for auth state
- React Query for server state
- Local state for UI

### MongoDB Indexes
- Organization: name, plan
- User: email, organizationId
- Student: organizationId, studentId, classIds, status
- Class: organizationId, code
- Fee: organizationId, studentId, feePeriodId, status
- Payment: organizationId, studentId, transactionId, status

## 8. Security
- JWT authentication với refresh tokens
- Password hashing với bcrypt
- Rate limiting
- Input validation với Joi/Zod
- CORS configuration
- Helmet for HTTP headers
- MongoDB injection prevention

## 9. Deployment
- Backend: Node.js + PM2
- Frontend: Vercel/Netlify hoặc Nginx
- Database: MongoDB Atlas (cloud) hoặc self-hosted
- SSL required
