# UniLake AI · Frontend

Ứng dụng web phục vụ quản trị, khai thác và phân tích dữ liệu của nền tảng **UniLake AI**, với phạm vi nghiệp vụ gồm **Tuyển sinh**, **Đào tạo** và **Nhân sự**.

Frontend được xây dựng trên Next.js App Router và tổ chức giao diện theo vai trò người dùng. Repository có thể cài đặt, phát triển và build độc lập; các chức năng xác thực và truy xuất dữ liệu tích hợp với dịch vụ `Unilake-BE` qua REST API.

## Mục lục

- [Phạm vi chức năng](#phạm-vi-chức-năng)
- [Nền tảng kỹ thuật](#nền-tảng-kỹ-thuật)
- [Thiết lập môi trường](#thiết-lập-môi-trường)
- [Cấu hình kết nối API](#cấu-hình-kết-nối-api)
- [Phát triển và kiểm tra chất lượng](#phát-triển-và-kiểm-tra-chất-lượng)
- [Tổ chức mã nguồn](#tổ-chức-mã-nguồn)
- [Quản lý API contract](#quản-lý-api-contract)
- [Triển khai](#triển-khai)
- [Trạng thái tích hợp](#trạng-thái-tích-hợp)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

## Phạm vi chức năng

| Vai trò | Đường dẫn chính | Nhóm chức năng |
| --- | --- | --- |
| Quản trị hệ thống (`ADMIN`) | `/admin` | Quản lý người dùng, phân quyền, cấu hình và nhật ký hệ thống |
| Quản trị dữ liệu (`DATA_ADMIN`) | `/data` | Quản lý nguồn dữ liệu, nạp dữ liệu, catalog, chất lượng và lineage |
| Nhân viên Tuyển sinh (`ADMISSIONS_STAFF`) | `/analyst` | Khám phá và truy vấn dữ liệu Tuyển sinh |
| Nhân viên Đào tạo (`ACADEMIC_STAFF`) | `/analyst` | Khám phá và truy vấn dữ liệu Đào tạo |
| Nhân viên Nhân sự (`HR_STAFF`) | `/analyst` | Khám phá và truy vấn dữ liệu Nhân sự |
| Trưởng phòng Tuyển sinh (`ADMISSIONS_MANAGER`) | `/manager` | Theo dõi và phân tích dữ liệu Tuyển sinh |
| Trưởng phòng Đào tạo (`ACADEMIC_MANAGER`) | `/manager` | Theo dõi và phân tích dữ liệu Đào tạo |
| Trưởng phòng Nhân sự (`HR_MANAGER`) | `/manager` | Theo dõi và phân tích dữ liệu Nhân sự |
| Ban Giám hiệu (`VIEWER`) | `/viewer` | Tổng quan điều hành và dashboard |

Bảng trên mô tả phạm vi giao diện. Mức độ kết nối backend của từng nhóm chức năng được trình bày tại [Trạng thái tích hợp](#trạng-thái-tích-hợp).

## Nền tảng kỹ thuật

| Thành phần | Công nghệ |
| --- | --- |
| Framework | Next.js 15, React 19, TypeScript |
| Giao diện | Tailwind CSS, Radix UI, Lucide |
| Trực quan hóa | Recharts |
| Truy xuất dữ liệu | TanStack Query, Axios, `openapi-fetch` |
| Biểu mẫu và xác thực dữ liệu | React Hook Form, Zod |
| Kiểm thử | Vitest, Testing Library |
| Chất lượng mã nguồn | ESLint, Prettier |
| Đóng gói và CI | Docker, GitHub Actions, Lighthouse CI |

## Thiết lập môi trường

### Yêu cầu

- **Node.js 24**, đồng nhất với môi trường Docker, CI và Vercel.
- **pnpm 10.0.0**, theo trường `packageManager` trong `package.json`.
- Backend hoạt động và tài khoản hợp lệ để sử dụng các chức năng yêu cầu xác thực.

### Cài đặt và khởi chạy

Thực hiện tại thư mục gốc của repository:

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install --frozen-lockfile
cp .env.local.example .env.local
pnpm dev
```

Ứng dụng mặc định chạy tại [http://localhost:3000](http://localhost:3000). Truy cập [trang đăng nhập](http://localhost:3000/login) bằng tài khoản được cấp từ backend.

## Cấu hình kết nối API

Các biến môi trường được khai báo trong `.env.local`, dựa trên [.env.local.example](.env.local.example).

| Biến | Development | Production |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL backend thực tế dùng `https://` |

Đây là biến URL backend duy nhất, được đọc tại `src/api/api.ts` cho cả Axios client và route handler. Nếu biến trống, ứng dụng dùng `http://localhost:8000`. Có thể cấu hình URL có hoặc không có `/api/v1` vì ứng dụng tự chuẩn hóa tiền tố. Không đặt token, mật khẩu hoặc query trong URL này vì `NEXT_PUBLIC_*` là cấu hình công khai.

- **Axios:** trình duyệt gọi trực tiếp backend qua `src/api/http.ts`; login/refresh/logout và API nghiệp vụ dùng chung instance `http`, cùng URL và timeout 30 giây. Interceptor bỏ qua gắn token và refresh cho ba endpoint xác thực để tránh vòng lặp 401. Backend cần cho phép origin frontend trong CORS, cùng header `Authorization`, `Content-Type` và các method sử dụng.
- **Next.js:** các route handler giữ `fetch` phía server để bảo toàn xử lý cookie, FormData và chuyển tiếp response stream. OpenAPI client hiện chưa được sử dụng trong giao diện, giữ proxy cùng origin `/api/proxy` và kiểu sinh tự động.
- **HTTPS** URL cấu hình ở production phải dùng HTTPS. Development và test cho phép HTTP trên `localhost` và `127.0.0.1`.

### Vai trò đăng nhập

Frontend nhận 9 role từ backend: `ADMIN`, `DATA_ADMIN`, `VIEWER` và 6 role phòng ban
`ADMISSIONS_MANAGER/STAFF`, `ACADEMIC_MANAGER/STAFF`, `HR_MANAGER/STAFF`.
Ba role `*_MANAGER` dùng nhóm trang `/manager`; ba role `*_STAFF` dùng nhóm trang
`/analyst`. Giao diện chọn phân hệ được cố định theo phòng ban. `VIEWER` chỉ có
dashboard theo quyền seed hiện tại. Việc cố định phân hệ trên giao diện không thay
thế kiểm tra quyền và phạm vi dữ liệu ở backend.

Khởi động lại dev server sau khi cập nhật `.env.local`. Các biến `NEXT_PUBLIC_*` được đưa vào bundle tại thời điểm build; thay đổi các giá trị này trong môi trường production yêu cầu build lại ứng dụng.

## Phát triển và kiểm tra chất lượng

### Các lệnh chính

| Lệnh | Mô tả |
| --- | --- |
| `pnpm dev` | Khởi chạy môi trường phát triển với Turbopack |
| `pnpm build` | Tạo bản build production |
| `pnpm start` | Khởi chạy bản build production |
| `pnpm type-check` | Kiểm tra kiểu dữ liệu TypeScript |
| `pnpm lint` | Kiểm tra ESLint với ngưỡng cảnh báo bằng 0 |
| `pnpm lint:fix` | Tự động sửa các lỗi ESLint được hỗ trợ |
| `pnpm format` | Định dạng mã nguồn trong `src/` |
| `pnpm format:check` | Kiểm tra định dạng mã nguồn trong `src/` |
| `pnpm test` | Chạy unit test và component test |
| `pnpm test:watch` | Chạy kiểm thử ở chế độ theo dõi thay đổi |
| `pnpm check-all` | Kiểm tra TypeScript, ESLint, định dạng và build |
| `pnpm gen:api` | Sinh khai báo TypeScript từ OpenAPI contract |

### Kiểm tra trước khi gửi thay đổi

```bash
pnpm check-all
pnpm test
```

`check-all` chưa bao gồm kiểm thử Vitest. Cấu hình Next.js hiện bỏ qua ESLint trong quá trình build, do đó lint cần được thực hiện riêng hoặc thông qua `check-all`.

### Continuous integration

Workflow [Frontend CI/CD](.github/workflows/ci-frontend.yml) áp dụng cho sự kiện push và pull request vào `main`, `develop`. Quy trình gồm cài đặt dependency, kiểm tra TypeScript, ESLint, định dạng, Vitest, build và đánh giá bằng Lighthouse CI. Sau khi tất cả kiểm tra thành công, chỉ push lên `develop` được deploy lên Vercel Production. Nhánh `main` chỉ chạy CI. Pull request chỉ chạy CI và không sử dụng secrets triển khai.

## Tổ chức mã nguồn

```text
.
├── src/
│   ├── app/          # Định tuyến, layout và provider
│   │   └── api/      # Route handler của Next.js
│   ├── api/          # Cấu hình backend, Axios client và kiểu OpenAPI
│   │   ├── shared/   # Lệnh gọi được nhiều nhóm vai trò sử dụng
│   │   ├── data-admin/ # Danh mục và nguồn gốc dữ liệu dành riêng cho DATA_ADMIN
│   │   └── data-operations/ # Tác vụ quản trị dữ liệu dùng bởi ADMIN và DATA_ADMIN
│   ├── views/        # Màn hình theo nhóm chức năng nghiệp vụ
│   ├── components/   # Thành phần giao diện, bố cục và biểu đồ
│   ├── lib/          # Session, lịch sử truy vấn và tiện ích
│   ├── config/       # Cấu hình vai trò, menu, phân hệ và nguồn dữ liệu
│   ├── hooks/        # Hook xác thực và lựa chọn phân hệ
│   ├── types/        # Khai báo kiểu dữ liệu dùng chung
│   └── styles/       # Stylesheet toàn cục
├── docs/             # API contract và tài liệu kiểm thử tích hợp
├── public/           # Tài nguyên tĩnh
├── .github/workflows/ # Quy trình CI
└── Dockerfile        # Cấu hình build và chạy container
```

Các file kiểm thử `*.test.ts` và `*.test.tsx` được đặt cạnh mã nguồn tương ứng. `src/api/api.ts`, `src/api/http.ts` và kiểu OpenAPI ở gốc `src/api/` được dùng chung. Thư mục lệnh gọi phản ánh quyền backend. Các API trong `shared/` vẫn có thể giới hạn theo vai trò, phân hệ hoặc người được giao. Proxy backend nằm tại `src/app/api/proxy/[...path]/route.ts`.

## Quản lý API contract

Snapshot OpenAPI được lưu tại `docs/api/openapi.json`. Khi tích hợp một phiên bản backend mới:

1. Cập nhật snapshot theo contract của phiên bản backend tương ứng.
2. Chạy lệnh sinh khai báo kiểu dữ liệu:

   ```bash
   pnpm gen:api
   ```

3. Rà soát thay đổi trong `src/api/schema.d.ts`; cập nhật các hàm gọi API và kiểu dữ liệu liên quan trong `src/api/`, `src/types/`.
4. Chạy kiểm tra TypeScript, kiểm thử tự động và kiểm tra tích hợp cho các luồng bị ảnh hưởng.

`src/api/schema.d.ts` là file được sinh tự động. Mọi thay đổi contract cần bắt đầu từ snapshot OpenAPI để tránh bị ghi đè ở lần sinh tiếp theo.

## Triển khai

### Vercel qua GitHub Actions

#### Thiết lập một lần

1. Tạo project trên Vercel cho repository này, chọn framework **Next.js**, Root Directory là thư mục gốc repository (`.`), Node.js **24.x** và Production Branch là `develop`.
2. Trong **Vercel → Project → Settings → Environment Variables**, đặt `NEXT_PUBLIC_API_URL` cho môi trường **Production**.

   | Biến | Ví dụ |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://api.example.com` |

   Thay `api.example.com` bằng backend thực tế có HTTPS, truy cập được từ Vercel và trình duyệt. Backend cần cho phép CORS với domain Production của frontend. Không dùng `localhost` cho backend đã triển khai.

3. Tạo token tại [Vercel Account Settings → Tokens](https://vercel.com/account/tokens), cấp quyền cho tài khoản hoặc team sở hữu project.
4. Lấy Project ID và Team/Organization ID trong phần Settings tương ứng trên Vercel. Hoặc chạy tại thư mục gốc repository:

   ```bash
   pnpm dlx vercel@latest login
   pnpm dlx vercel@latest link
   ```

   Chọn đúng team và project vừa tạo. File `.vercel/project.json` chứa `projectId` và `orgId`; thư mục `.vercel/` đã được bỏ qua trong Git.

5. Trong **GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret**, thêm:

   | Secret | Giá trị |
   | --- | --- |
   | `VERCEL_TOKEN` | Token vừa tạo |
   | `VERCEL_ORG_ID` | `orgId` của team hoặc tài khoản sở hữu project |
   | `VERCEL_PROJECT_ID` | `projectId` của project frontend |

   Khai báo secrets bằng giao diện GitHub, không ghi token vào repository. Workflow sử dụng GitHub Environment `production`; nếu repository đã đặt quy tắc bảo vệ môi trường, cần cho phép nhánh `develop` triển khai.

#### Luồng triển khai

| Sự kiện | Kết quả sau khi CI thành công |
| --- | --- |
| Pull request vào `main` hoặc `develop` | Chỉ kiểm tra CI |
| Push/merge vào `develop` | Deploy Production và cập nhật domain production |
| Push/merge vào `main` | Chỉ kiểm tra CI |

Job deploy chạy `vercel pull` để lấy cấu hình và biến môi trường, `vercel build` để tạo artifact, sau đó `vercel deploy --prebuilt` để triển khai. Production dùng thêm `--prod` ở cả bước build và deploy, theo [hướng dẫn GitHub Actions của Vercel](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel). Bản build trong job CI dùng để kiểm tra và chạy Lighthouse; job deploy build lại với đúng biến môi trường lấy từ Vercel.

File [vercel.json](vercel.json) tắt tự động deploy từ Git bằng `git.deploymentEnabled: false` để chỉ triển khai qua workflow sau khi CI thành công, theo [cấu hình Git của Vercel](https://vercel.com/docs/project-configuration/git-configuration). Workflow báo lỗi rõ ràng nếu thiếu secrets. URL triển khai được ghi trong **GitHub Actions → workflow run → Summary** và GitHub Environment tương ứng.

Sau khi cấu hình xong, push thay đổi lên `develop` để đưa lên Production. Merge vào `main` không kích hoạt deploy. Khi thay đổi biến `NEXT_PUBLIC_*` trên Vercel, cần chạy lại workflow để build và deploy với giá trị mới.

### Chạy trực tiếp

Sau khi cấu hình biến môi trường cho môi trường đích:

```bash
pnpm build
pnpm start
```

### Chạy bằng Docker

Ví dụ production (thay domain ví dụ bằng backend HTTPS thực tế):

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://backend.example.com \
  -t unilake-fe .

docker run --rm \
  -p 3000:3000 \
  unilake-fe
```

Ứng dụng được cung cấp tại [http://localhost:3000](http://localhost:3000).

Khi backend đổi domain, chỉ sửa `NEXT_PUBLIC_API_URL` trong `.env.local` hoặc cấu hình hosting/build Docker, rồi build lại ứng dụng. Backend cần cấu hình CORS cho origin thực tế của frontend.

## Trạng thái tích hợp

| Nhóm chức năng | Trạng thái |
| --- | --- |
| Xác thực | Đã tích hợp API đăng nhập, làm mới token và đăng xuất |
| Nguồn dữ liệu | Đã tích hợp API danh sách, chi tiết, tạo và cập nhật |
| Ingestion | Đã có API client cho danh sách và tạo job; báo cáo tích hợp chưa xác nhận luồng tạo job thành công |
| Catalog và khám phá dữ liệu | Đã tích hợp API catalog |
| Truy vấn AI | Đã kết nối `/api/v1/nlq/ask`; theo báo cáo ngày 29/10/2026, backend trả dữ liệu mô phỏng |
| Lịch sử truy vấn | Lưu tại `localStorage` của trình duyệt, chưa đồng bộ backend |
| Dashboard, Data Quality, Data Lineage, quản trị hệ thống | Giao diện sử dụng dữ liệu mẫu |

Kết quả kiểm thử backend, các khác biệt so với API contract và công việc tích hợp còn lại được ghi nhận trong [báo cáo tích hợp API](docs/api-integration-report.md).

## Tài liệu tham khảo

- [Mẫu cấu hình môi trường](.env.local.example)
- [OpenAPI contract](docs/api/openapi.json)
- [Báo cáo kiểm thử tích hợp API](docs/api-integration-report.md)
- [Checklist kiểm thử và xử lý lỗi](docs/error-checklist.md)
- [Cấu hình Frontend CI/CD](.github/workflows/ci-frontend.yml)
- [Cấu hình Vercel](vercel.json)
