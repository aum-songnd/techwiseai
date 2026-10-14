CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),

    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    locked BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Username không phân biệt chữ hoa/chữ thường và không được trùng.
CREATE UNIQUE INDEX uk_users_username_lower
    ON users (LOWER(username));

-- Email không phân biệt chữ hoa/chữ thường và không được trùng.
CREATE UNIQUE INDEX uk_users_email_lower
    ON users (LOWER(email));

-- Số điện thoại có thể để trống nhưng nếu có thì không được trùng.
CREATE UNIQUE INDEX uk_users_phone
    ON users (phone)
    WHERE phone IS NOT NULL;


CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_roles_code UNIQUE (code)
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
        'Quản lý toàn bộ hệ thống, người dùng, sản phẩm, đơn hàng và cấu hình'
    ),
    (
        'STAFF',
        'Nhân viên',
        'Quản lý sản phẩm, tồn kho, khách hàng và xử lý đơn hàng'
    ),
    (
        'CUSTOMER',
        'Khách hàng',
        'Mua sản phẩm, quản lý giỏ hàng, địa chỉ và theo dõi đơn hàng'
    );