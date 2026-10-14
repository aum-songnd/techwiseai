package com.university.regulation.bootstrap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.university.regulation.models.enums.RoleCode;
import com.university.regulation.models.role.Role;
import com.university.regulation.models.user.User;
import com.university.regulation.repository.RoleRepository;
import com.university.regulation.repository.UserRepository;

@Component
public class AdminInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap-admin.username}")
    private String username;

    @Value("${app.bootstrap-admin.password}")
    private String password;

    @Value("${app.bootstrap-admin.email}")
    private String email;

    @Value("${app.bootstrap-admin.full-name}")
    private String fullName;

    public AdminInitializer(
        UserRepository userRepository,
        RoleRepository roleRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            return;
        }

        Role adminRole = roleRepository
            .findByCode(RoleCode.ADMIN)
            .orElseThrow(() ->
                new IllegalStateException(
                    "Không tìm thấy role ADMIN trong database"
                )
            );

        User admin = new User();
        admin.setUsername(username);
        admin.setEmail(email);
        admin.setFullName(fullName);

        admin.setPasswordHash(
            passwordEncoder.encode(password)
        );

        admin.setEnabled(true);
        admin.setLocked(false);
        admin.addRole(adminRole);

        userRepository.save(admin);

        System.out.println(
            "Đã tạo tài khoản ADMIN ban đầu: " + username
        );
    }
}
