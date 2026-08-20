CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,

    full_name VARCHAR(255) NOT NULL,
    student_code VARCHAR(50),

    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    locked BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Không phân biệt chữ hoa/chữ thường khi kiểm tra username.
CREATE UNIQUE INDEX uk_users_username_lower
    ON users (LOWER(username));

-- Email có thể để trống nhưng nếu có thì không được trùng.
CREATE UNIQUE INDEX uk_users_email_lower
    ON users (LOWER(email))
    WHERE email IS NOT NULL;

-- Mã sinh viên có thể để trống nhưng nếu có thì không được trùng.
CREATE UNIQUE INDEX uk_users_student_code
    ON users (student_code)
    WHERE student_code IS NOT NULL;


CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_roles_code UNIQUE (code),

    CONSTRAINT chk_roles_code CHECK (
        code IN ('ADMIN', 'STAFF', 'STUDENT', 'GUEST')
    )
);


CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,

    assigned_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_user_roles
        PRIMARY KEY (user_id, role_id),

    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id)
        REFERENCES roles (id)
        ON DELETE CASCADE
);

INSERT INTO roles (
    code,
    name,
    description
)
VALUES
    (
        'ADMIN',
        'Quản trị hệ thống',
        'Quản lý người dùng, phân quyền, tài liệu và cấu hình hệ thống'
    ),
    (
        'STAFF',
        'Cán bộ nhà trường',
        'Upload, cập nhật và gửi duyệt tài liệu'
    ),
    (
        'STUDENT',
        'Sinh viên',
        'Tra cứu tài liệu và sử dụng chức năng hỏi đáp'
    ),
    (
        'GUEST',
        'Khách',
        'Tra cứu các nội dung được công khai'
    );