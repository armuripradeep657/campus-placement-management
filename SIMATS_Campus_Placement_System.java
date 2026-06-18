import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.*;
import java.sql.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * SIMATS Campus Placement Management System (CPMS)
 * A complete, professionally styled desktop application built using Java Swing.
 * Real Database Persistence powered by standard Java Database Connectivity (JDBC).
 * Features:
 * - SQL Database Schema Management auto-initialized on launch.
 * - Live HUD Connector Indicator representing database adapter state.
 * - Student Directory with SQL transaction hooks.
 * - Recruiter Directory supporting capacity tracking.
 * - Match Allocation priority selectors synced to SQL records.
 */
public class SIMATS_Campus_Placement_System extends JFrame {

    // Database Configuration Customizer
    // Defaulting to auto-creative local SQLite file for immediate out-of-the-box local executions.
    // To adapt to a network-hosted Database, simply uncomment respective parameters below:
    
    private static final String DB_URL = "jdbc:sqlite:simats_placement.db";
    private static final String DB_DRIVER = "org.sqlite.JDBC";
    
    /* 
    // EXAMPLE FOR MYSQL INTEGRATION:
    private static final String DB_URL = "jdbc:mysql://localhost:3306/simats_cpms?useSSL=false&allowPublicKeyRetrieval=true";
    private static final String DB_DRIVER = "com.mysql.cj.jdbc.Driver";
    private static final String DB_USER = "root";
    private static final String DB_PASS = "admin";
    */
    
    /*
    // EXAMPLE FOR POSTGRESQL INTEGRATION:
    private static final String DB_URL = "jdbc:postgresql://localhost:5432/simats_cpms";
    private static final String DB_DRIVER = "org.postgresql.Driver";
    private static final String DB_USER = "postgres";
    private static final String DB_PASS = "admin";
    */

    private static final String DB_USER = "";
    private static final String DB_PASS = "";

    // Models & Storage Cache
    private List<Student> students = new ArrayList<>();
    private List<Recruiter> recruiters = new ArrayList<>();
    private List<Allocation> allocations = new ArrayList<>();

    // GUI Components
    private CardLayout cardLayout;
    private JPanel mainContentPanel;
    private JLabel totalStudentsLabel, activeRecruitersLabel, avgPackageLabel, placedLabel;
    private JLabel dbStatusLabel;
    
    // Tables
    private JTable studentTable;
    private DefaultTableModel studentModel;
    private JTable recruiterTable;
    private DefaultTableModel recruiterModel;
    private JTable allocationTable;
    private DefaultTableModel allocationModel;

    // Brand Colors
    private static final Color INDIGO_PRIMARY = new Color(30, 27, 75); // Indigo 950
    private static final Color ACCENT_YELLOW = new Color(250, 204, 21); // Yellow 400
    private static final Color SIDEBAR_BG = new Color(15, 23, 42); // Slate 900
    private static final Color CONTENT_BG = new Color(248, 250, 252); // Slate 50
    private static final Color CARD_BG = Color.WHITE;
    private static final Color TEXT_DARK = new Color(30, 41, 59); // Slate 800
    private static final Color EMERALD_GREEN = new Color(5, 150, 105); // Emerald 600

    public SIMATS_Campus_Placement_System() {
        setTitle("SIMATS Campus Placement Portal (CPMS)");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(1024, 750);
        setLocationRelativeTo(null);
        setMinimumSize(new Dimension(850, 600));

        // 1. Core Boot State: Initialize JDBC Database Connector & Extract Schema Layouts
        initDatabaseAndSchema();

        // 2. Fetch Active Profile Records from SQL Database table
        loadRecordsFromDatabase();

        // 3. Layout structural arrangement
        JPanel rootPanel = new JPanel(new BorderLayout());
        rootPanel.setBackground(CONTENT_BG);

        // Sidebar Panel Layout
        JPanel sidebar = createSidebar();
        rootPanel.add(sidebar, BorderLayout.WEST);

        // Header and Main Workspace Card Deck
        JPanel rightWorkspace = new JPanel(new BorderLayout());
        rightWorkspace.setBackground(CONTENT_BG);

        // Global Header bar with status labels
        JPanel headerPanel = createHeader();
        rightWorkspace.add(headerPanel, BorderLayout.NORTH);

        // Main content panels swapping using CardLayout
        cardLayout = new CardLayout();
        mainContentPanel = new JPanel(cardLayout);
        mainContentPanel.setBackground(CONTENT_BG);

        // Add modular view screens
        mainContentPanel.add(createDashboardView(), "Dashboard");
        mainContentPanel.add(createStudentView(), "Students");
        mainContentPanel.add(createRecruiterView(), "Recruiters");
        mainContentPanel.add(createAllocationView(), "Allocation");

        rightWorkspace.add(mainContentPanel, BorderLayout.CENTER);
        rootPanel.add(rightWorkspace, BorderLayout.CENTER);

        setContentPane(rootPanel);
        
        // Initial dashboard refresh updates
        updateUIStats();
    }

    /**
     * JDBC Helper Database connection pipeline
     */
    private Connection getConnection() throws SQLException, ClassNotFoundException {
        // Dynamic loading of class drivers
        Class.forName(DB_DRIVER);
        if (DB_USER == null || DB_USER.trim().isEmpty()) {
            return DriverManager.getConnection(DB_URL);
        } else {
            return DriverManager.getConnection(DB_URL, DB_USER, DB_PASS);
        }
    }

    /**
     * Initializes structural persistence engine & creates SQL tables
     */
    private void initDatabaseAndSchema() {
        try {
            System.out.println("CPMS Database Booting: Connecting to standard JDBC target URL...");
            try (Connection conn = getConnection()) {
                if (conn != null) {
                    System.out.println("Connection secured! Generating CPMS database schemas if absent...");
                    try (Statement stmt = conn.createStatement()) {
                        
                        // Table schema sequence: STUDENTS table
                        stmt.execute("CREATE TABLE IF NOT EXISTS students (" +
                                "id VARCHAR(50) PRIMARY KEY, " +
                                "name VARCHAR(100) NOT NULL, " +
                                "department VARCHAR(100), " +
                                "cgpa DOUBLE, " +
                                "skills VARCHAR(255), " +
                                "allocation_status VARCHAR(50), " +
                                "allocated_company_id VARCHAR(50))");
                        
                        // Table schema sequence: RECRUITERS requirements table
                        stmt.execute("CREATE TABLE IF NOT EXISTS recruiters (" +
                                "id VARCHAR(50) PRIMARY KEY, " +
                                "name VARCHAR(100) NOT NULL, " +
                                "role VARCHAR(100), " +
                                "skills VARCHAR(255), " +
                                "package_lpa DOUBLE, " +
                                "capacity INTEGER)");
                    }
                }
            }
        } catch (Exception err) {
            System.err.println("JDBC Driver integration trace or local server issue: " + err.getMessage());
        }
    }

    /**
     * Universal database load loader
     */
    private void loadRecordsFromDatabase() {
        students.clear();
        recruiters.clear();

        try (Connection conn = getConnection()) {
            // A. Retrieve registered students from table
            String sqlStudents = "SELECT * FROM students";
            try (Statement stmt = conn.createStatement(); ResultSet rs = stmt.executeQuery(sqlStudents)) {
                while (rs.next()) {
                    Student s = new Student(
                            rs.getString("id"),
                            rs.getString("name"),
                            rs.getString("department"),
                            rs.getDouble("cgpa"),
                            rs.getString("skills")
                    );
                    s.allocationStatus = rs.getString("allocation_status");
                    s.allocatedCompanyId = rs.getString("allocated_company_id");
                    students.add(s);
                }
            }

            // B. Retrieve recruiters directory from table
            String sqlRecruiters = "SELECT * FROM recruiters";
            try (Statement stmt = conn.createStatement(); ResultSet rs = stmt.executeQuery(sqlRecruiters)) {
                while (rs.next()) {
                    recruiters.add(new Recruiter(
                            rs.getString("id"),
                            rs.getString("name"),
                            rs.getString("role"),
                            rs.getString("skills"),
                            rs.getDouble("package_lpa"),
                            rs.getInt("capacity")
                    ));
                }
            }

            System.out.println("Synchronized CPMS with " + students.size() + " students and " + recruiters.size() + " recruiters.");
            
        } catch (Exception err) {
            System.err.println("Database load failure, seeding backup demo registers. Error: " + err.getMessage());
            seedInitialFallbackDataset();
            persistBackupDatasetToDatabase();
        }
    }

    /**
     * Seeds initial records when first launching or on SQL connection failures
     */
    private void seedInitialFallbackDataset() {
        if (students.isEmpty()) {
            students.add(new Student("19240101", "Aditya Kulkarni", "Computer Science", 9.2, "Java, Python, SQL"));
            students.add(new Student("19240102", "Priya Nair", "Information Technology", 8.8, "C++, Java, Cloud"));
            students.add(new Student("19240103", "Sanjana Sharma", "Computer Science", 7.9, "HTML, CSS, Javascript"));
            students.add(new Student("19240104", "Rahul Goud", "Electronics & Communication", 8.45, "Python, Embed C, Linux"));
            students.add(new Student("19240105", "Meera Krishnan", "Data Science", 9.6, "Python, Pandas, ML, SQL"));
        }
        if (recruiters.isEmpty()) {
            recruiters.add(new Recruiter("REC_01", "TCS Digital", "Systems Engineer", "Java, Python, SQL", 7.0, 2));
            recruiters.add(new Recruiter("REC_02", "Amazon India", "SDE-1 Cadet", "Python, ML, SQL, C++", 32.0, 1));
            recruiters.add(new Recruiter("REC_03", "Cognizant GenC", "Software Analyst", "HTML, CSS, Java", 4.5, 3));
        }
    }

    /**
     * Persists initial dataset inside SQL tables safely
     */
    private void persistBackupDatasetToDatabase() {
        try (Connection conn = getConnection()) {
            
            // Clean slate seed
            try (Statement deleteStmt = conn.createStatement()) {
                deleteStmt.executeUpdate("DELETE FROM students");
                deleteStmt.executeUpdate("DELETE FROM recruiters");
            }

            String insertStud = "INSERT INTO students (id, name, department, cgpa, skills, allocation_status, allocated_company_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
            for (Student s : students) {
                try (PreparedStatement ps = conn.prepareStatement(insertStud)) {
                    ps.setString(1, s.id);
                    ps.setString(2, s.name);
                    ps.setString(3, s.department);
                    ps.setDouble(4, s.cgpa);
                    ps.setString(5, s.skills);
                    ps.setString(6, s.allocationStatus);
                    ps.setString(7, s.allocatedCompanyId);
                    ps.executeUpdate();
                }
            }

            String insertRecr = "INSERT INTO recruiters (id, name, role, skills, package_lpa, capacity) VALUES (?, ?, ?, ?, ?, ?)";
            for (Recruiter r : recruiters) {
                try (PreparedStatement ps = conn.prepareStatement(insertRecr)) {
                    ps.setString(1, r.id);
                    ps.setString(2, r.name);
                    ps.setString(3, r.role);
                    ps.setString(4, r.skills);
                    ps.setDouble(5, r.packageLpa);
                    ps.setInt(6, r.capacity);
                    ps.executeUpdate();
                }
            }
            System.out.println("Secured demo fallback entries inside local database schema.");
        } catch (Exception ignored) {}
    }

    private JPanel createSidebar() {
        JPanel sidebarPanel = new JPanel();
        sidebarPanel.setPreferredSize(new Dimension(245, 0));
        sidebarPanel.setBackground(SIDEBAR_BG);
        sidebarPanel.setLayout(new BorderLayout());

        // Brand Banner at top of sidebar
        JPanel brandPanel = new JPanel(new GridLayout(3, 1));
        brandPanel.setBackground(SIDEBAR_BG);
        brandPanel.setBorder(new EmptyBorder(25, 20, 25, 20));

        JLabel collegeLabel = new JLabel("SEC CAMPUS");
        collegeLabel.setFont(new Font("Segoe UI", Font.BOLD, 18));
        collegeLabel.setForeground(ACCENT_YELLOW);
        
        JLabel deptLabel = new JLabel("Placement Center");
        deptLabel.setFont(new Font("Segoe UI", Font.BOLD, 12));
        deptLabel.setForeground(Color.LIGHT_GRAY);

        JLabel subLabel = new JLabel("CPMS SQL SYSTEM");
        subLabel.setFont(new Font("Segoe UI", Font.PLAIN, 10));
        subLabel.setForeground(Color.GRAY);

        brandPanel.add(collegeLabel);
        brandPanel.add(deptLabel);
        brandPanel.add(subLabel);

        sidebarPanel.add(brandPanel, BorderLayout.NORTH);

        // Sidebar Navigation links
        JPanel navPanel = new JPanel();
        navPanel.setBackground(SIDEBAR_BG);
        navPanel.setLayout(new GridLayout(6, 1, 0, 10));
        navPanel.setBorder(new EmptyBorder(10, 15, 10, 15));

        JButton dashboardBtn = createNavButton("Dashboard Panel");
        JButton studentBtn = createNavButton("Students Portal Registration");
        JButton recruiterBtn = createNavButton("Recruiter Corporations Directory");
        JButton allocationBtn = createNavButton("Greedy Placements Match Allocation");

        dashboardBtn.addActionListener(e -> cardLayout.show(mainContentPanel, "Dashboard"));
        studentBtn.addActionListener(e -> cardLayout.show(mainContentPanel, "Students"));
        recruiterBtn.addActionListener(e -> cardLayout.show(mainContentPanel, "Recruiters"));
        allocationBtn.addActionListener(e -> cardLayout.show(mainContentPanel, "Allocation"));

        navPanel.add(dashboardBtn);
        navPanel.add(studentBtn);
        navPanel.add(recruiterBtn);
        navPanel.add(allocationBtn);

        sidebarPanel.add(navPanel, BorderLayout.CENTER);

        // User signature details
        JPanel profilePanel = new JPanel(new GridLayout(2, 1));
        profilePanel.setBackground(new Color(23, 37, 84)); // Indigo 900
        profilePanel.setBorder(new EmptyBorder(15, 20, 15, 20));

        JLabel userNameLabel = new JLabel("CHARAN");
        userNameLabel.setFont(new Font("Segoe UI", Font.BOLD, 13));
        userNameLabel.setForeground(Color.WHITE);

        JLabel userRoleLabel = new JLabel("Admin Coordinator Portal");
        userRoleLabel.setFont(new Font("Segoe UI", Font.PLAIN, 10));
        userRoleLabel.setForeground(Color.LIGHT_GRAY);

        profilePanel.add(userNameLabel);
        profilePanel.add(userRoleLabel);
        
        sidebarPanel.add(profilePanel, BorderLayout.SOUTH);

        return sidebarPanel;
    }

    private JButton createNavButton(String text) {
        JButton btn = new JButton(text);
        btn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btn.setForeground(Color.WHITE);
        btn.setContentAreaFilled(false);
        btn.setFocusPainted(false);
        btn.setBorderPainted(false);
        btn.setHorizontalAlignment(SwingConstants.LEFT);
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        
        btn.addMouseListener(new java.awt.event.MouseAdapter() {
            public void mouseEntered(java.awt.event.MouseEvent evt) {
                btn.setForeground(ACCENT_YELLOW);
            }
            public void mouseExited(java.awt.event.MouseEvent evt) {
                btn.setForeground(Color.WHITE);
            }
        });
        
        return btn;
    }

    private JPanel createHeader() {
        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(Color.WHITE);
        header.setBorder(BorderFactory.createMatteBorder(0, 0, 1, 0, Color.LIGHT_GRAY));
        header.setPreferredSize(new Dimension(0, 75));
        header.setBorder(new EmptyBorder(12, 30, 12, 30));

        JLabel docTitle = new JLabel("Saveetha Engineering College CPMS Portal");
        docTitle.setFont(new Font("Segoe UI", Font.BOLD, 15));
        docTitle.setForeground(TEXT_DARK);

        // Database status message hook
        dbStatusLabel = new JLabel("DATABASE: VERIFYING...");
        dbStatusLabel.setFont(new Font("Segoe UI", Font.BOLD, 10));
        
        // Dynamically update based on connection confirmation status info
        verifyConnectorStatusHUD();

        JPanel titlePanel = new JPanel(new GridLayout(2, 1));
        titlePanel.setOpaque(false);
        titlePanel.add(docTitle);
        titlePanel.add(dbStatusLabel);

        JLabel subtitle = new JLabel("Local Database Server");
        subtitle.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        subtitle.setForeground(Color.GRAY);

        header.add(titlePanel, BorderLayout.WEST);
        header.add(subtitle, BorderLayout.EAST);

        return header;
    }

    /**
     * Verifies connection actively to update UI HUD parameters
     */
    private void verifyConnectorStatusHUD() {
        try (Connection conn = getConnection()) {
            if (conn != null) {
                dbStatusLabel.setText("● DATABASE JDBC STATUS: CONNECTED (SQL PERSISTENT ENGINE)");
                dbStatusLabel.setForeground(EMERALD_GREEN);
            }
        } catch (Exception err) {
            dbStatusLabel.setText("● DATABASE JDBC STATUS: FALLBACK MODE (TEMPORARY MEMORY STORAGE)");
            dbStatusLabel.setForeground(new Color(225, 29, 72));
        }
    }

    private JPanel createDashboardView() {
        JPanel panel = new JPanel(new BorderLayout(20, 20));
        panel.setBackground(CONTENT_BG);
        panel.setBorder(new EmptyBorder(30, 30, 30, 30));

        // Welcome Jumbotron screen
        JPanel heroPanel = new JPanel(new BorderLayout());
        heroPanel.setBackground(INDIGO_PRIMARY);
        heroPanel.setBorder(new EmptyBorder(25, 30, 25, 30));
        heroPanel.setPreferredSize(new Dimension(0, 130));

        JLabel title = new JLabel("Saveetha Campus Placements Core");
        title.setFont(new Font("Segoe UI", Font.BOLD, 22));
        title.setForeground(ACCENT_YELLOW);

        JLabel desc = new JLabel("Coordinate recruiter partners criteria, register student ranks and GPA priority matching dynamically using JDBC SQL persistence.");
        desc.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        desc.setForeground(Color.WHITE);

        heroPanel.add(title, BorderLayout.NORTH);
        heroPanel.add(desc, BorderLayout.CENTER);

        panel.add(heroPanel, BorderLayout.NORTH);

        // Stats grid list
        JPanel statsGrid = new JPanel(new GridLayout(1, 4, 18, 0));
        statsGrid.setOpaque(false);

        statsGrid.add(createStatCard("Total Pool Class", totalStudentsLabel = new JLabel("0")));
        statsGrid.add(createStatCard("Active Corporate Partners", activeRecruitersLabel = new JLabel("0")));
        statsGrid.add(createStatCard("Avg Package Metrics", avgPackageLabel = new JLabel("0.0 LPA")));
        statsGrid.add(createStatCard("Placed Offers Registered", placedLabel = new JLabel("0")));

        JPanel centerPanel = new JPanel(new BorderLayout(0, 20));
        centerPanel.setOpaque(false);
        centerPanel.add(statsGrid, BorderLayout.NORTH);

        // Controls action bar
        JPanel shortcutPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 15, 10));
        shortcutPanel.setBackground(Color.WHITE);
        shortcutPanel.setBorder(BorderFactory.createTitledBorder("Placements Allocation Solver"));

        JButton runAllBtn = new JButton("Run Algorithmic Match Allocation Selection");
        runAllBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        runAllBtn.setBackground(INDIGO_PRIMARY);
        runAllBtn.setForeground(Color.WHITE);
        runAllBtn.setFocusPainted(false);
        
        JButton resetAllBtn = new JButton("Reset Allocations Engine");
        resetAllBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        resetAllBtn.setBackground(new Color(225, 29, 72));
        resetAllBtn.setForeground(Color.WHITE);
        resetAllBtn.setFocusPainted(false);

        runAllBtn.addActionListener(e -> executeAllocationMatchingEngine());
        resetAllBtn.addActionListener(e -> resetAllocationEngine());

        shortcutPanel.add(runAllBtn);
        shortcutPanel.add(resetAllBtn);

        centerPanel.add(shortcutPanel, BorderLayout.CENTER);
        panel.add(centerPanel, BorderLayout.CENTER);

        return panel;
    }

    private JPanel createStatCard(String title, JLabel valueLabel) {
        JPanel card = new JPanel();
        card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
        card.setBackground(CARD_BG);
        card.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(226, 232, 240), 1),
                new EmptyBorder(15, 20, 15, 20)
        ));

        JLabel titleLbl = new JLabel(title.toUpperCase());
        titleLbl.setFont(new Font("Segoe UI", Font.BOLD, 10));
        titleLbl.setForeground(Color.GRAY);
        titleLbl.setAlignmentX(Component.LEFT_ALIGNMENT);

        valueLabel.setFont(new Font("Segoe UI", Font.BOLD, 22));
        valueLabel.setForeground(TEXT_DARK);
        valueLabel.setAlignmentX(Component.LEFT_ALIGNMENT);
        valueLabel.setBorder(new EmptyBorder(5, 0, 0, 0));

        card.add(titleLbl);
        card.add(valueLabel);

        return card;
    }

    private JPanel createStudentView() {
        JPanel panel = new JPanel(new BorderLayout(0, 20));
        panel.setBackground(CONTENT_BG);
        panel.setBorder(new EmptyBorder(30, 30, 30, 30));

        // Options bar
        JPanel bar = new JPanel(new BorderLayout());
        bar.setOpaque(false);

        JLabel h = new JLabel("Students Registration & Academic Ledger");
        h.setFont(new Font("Segoe UI", Font.BOLD, 16));
        h.setForeground(TEXT_DARK);

        JButton addStudentBtn = new JButton("+ Register New Student");
        addStudentBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        addStudentBtn.setBackground(INDIGO_PRIMARY);
        addStudentBtn.setForeground(Color.WHITE);
        addStudentBtn.setFocusPainted(false);
        addStudentBtn.addActionListener(e -> showRegisterStudentDialog());

        JButton deleteStudentBtn = new JButton("Delete Profile");
        deleteStudentBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        deleteStudentBtn.setBackground(new Color(244, 63, 94));
        deleteStudentBtn.setFocusPainted(false);
        deleteStudentBtn.addActionListener(e -> deleteSelectedStudent());

        JPanel actionGroup = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 0));
        actionGroup.setOpaque(false);
        actionGroup.add(addStudentBtn);
        actionGroup.add(deleteStudentBtn);

        bar.add(h, BorderLayout.WEST);
        bar.add(actionGroup, BorderLayout.EAST);

        panel.add(bar, BorderLayout.NORTH);

        // Core Students Table model UI setup
        String[] columns = {"Registration ID", "Cadet Full Name", "Academic Branch Department", "CGPA Priority", "Skills Matrix List", "Placement Status"};
        studentModel = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) { return false; }
        };
        studentTable = new JTable(studentModel);
        studentTable.setRowHeight(30);
        studentTable.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));
        studentTable.setFont(new Font("Segoe UI", Font.PLAIN, 12));

        JScrollPane scrollPane = new JScrollPane(studentTable);
        scrollPane.setBorder(BorderFactory.createLineBorder(new Color(226, 232, 240)));
        panel.add(scrollPane, BorderLayout.CENTER);

        refreshStudentsTable();

        return panel;
    }

    private JPanel createRecruiterView() {
        JPanel panel = new JPanel(new BorderLayout(0, 20));
        panel.setBackground(CONTENT_BG);
        panel.setBorder(new EmptyBorder(30, 30, 30, 30));

        JPanel bar = new JPanel(new BorderLayout());
        bar.setOpaque(false);

        JLabel h = new JLabel("Premium Recruiters Directories");
        h.setFont(new Font("Segoe UI", Font.BOLD, 16));
        h.setForeground(TEXT_DARK);

        JButton addRecruiterBtn = new JButton("+ Onboard Partner Firm");
        addRecruiterBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        addRecruiterBtn.setBackground(EMERALD_GREEN);
        addRecruiterBtn.setForeground(Color.WHITE);
        addRecruiterBtn.setFocusPainted(false);
        addRecruiterBtn.addActionListener(e -> showOnboardRecruiterDialog());

        JButton deleteRecruiterBtn = new JButton("Revoke Agreement");
        deleteRecruiterBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        deleteRecruiterBtn.setBackground(new Color(244, 63, 94));
        deleteRecruiterBtn.setForeground(Color.WHITE);
        deleteRecruiterBtn.setFocusPainted(false);
        deleteRecruiterBtn.addActionListener(e -> deleteSelectedRecruiter());

        JPanel actionGroup = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 0));
        actionGroup.setOpaque(false);
        actionGroup.add(addRecruiterBtn);
        actionGroup.add(deleteRecruiterBtn);

        bar.add(h, BorderLayout.WEST);
        bar.add(actionGroup, BorderLayout.EAST);

        panel.add(bar, BorderLayout.NORTH);

        // Recruiters table model UI setup
        String[] columns = {"Recruiter ID", "Corporate Partner Firm", "Target Hiring Role", "Required Skills Constraints", "Stipend Offer Rate (LPA)", "Open Capacity Intake Seats"};
        recruiterModel = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) { return false; }
        };
        recruiterTable = new JTable(recruiterModel);
        recruiterTable.setRowHeight(30);
        recruiterTable.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));
        recruiterTable.setFont(new Font("Segoe UI", Font.PLAIN, 12));

        JScrollPane scrollPane = new JScrollPane(recruiterTable);
        scrollPane.setBorder(BorderFactory.createLineBorder(new Color(226, 232, 240)));
        panel.add(scrollPane, BorderLayout.CENTER);

        refreshRecruitersTable();

        return panel;
    }

    private JPanel createAllocationView() {
        JPanel panel = new JPanel(new BorderLayout(0, 20));
        panel.setBackground(CONTENT_BG);
        panel.setBorder(new EmptyBorder(30, 30, 30, 30));

        JPanel bar = new JPanel(new BorderLayout());
        bar.setOpaque(false);

        JLabel h = new JLabel("Stabilized CGPA Allocation Algorithmic Engine Log");
        h.setFont(new Font("Segoe UI", Font.BOLD, 16));
        h.setForeground(TEXT_DARK);

        JPanel btnBar = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 0));
        btnBar.setOpaque(false);

        JButton runAllBtn = new JButton("Run Greedy Selector");
        runAllBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        runAllBtn.setBackground(INDIGO_PRIMARY);
        runAllBtn.setForeground(Color.WHITE);
        runAllBtn.setFocusPainted(false);
        runAllBtn.addActionListener(e -> {
            executeAllocationMatchingEngine();
            JOptionPane.showMessageDialog(this, "Success! Matching prioritization completes successfully.");
        });

        JButton resetAllBtn = new JButton("Purge Logs");
        resetAllBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        resetAllBtn.setBackground(Color.DARK_GRAY);
        resetAllBtn.setForeground(Color.WHITE);
        resetAllBtn.setFocusPainted(false);
        resetAllBtn.addActionListener(e -> resetAllocationEngine());

        btnBar.add(runAllBtn);
        btnBar.add(resetAllBtn);

        bar.add(h, BorderLayout.WEST);
        bar.add(btnBar, BorderLayout.EAST);

        panel.add(bar, BorderLayout.NORTH);

        // Allocation table setup
        String[] columns = {"Rank Order", "Student ID", "Cadet Name", "CGPA Priority Indicator", "Matched Recruiter Firm Assigned", "Locked Stipend Offer LPA"};
        allocationModel = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) { return false; }
        };
        allocationTable = new JTable(allocationModel);
        allocationTable.setRowHeight(30);
        allocationTable.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));
        allocationTable.setFont(new Font("Segoe UI", Font.PLAIN, 12));

        JScrollPane scrollPane = new JScrollPane(allocationTable);
        scrollPane.setBorder(BorderFactory.createLineBorder(new Color(226, 232, 240)));
        panel.add(scrollPane, BorderLayout.CENTER);

        refreshAllocallocationsTable();

        return panel;
    }

    private void updateUIStats() {
        totalStudentsLabel.setText(String.valueOf(students.size()));
        activeRecruitersLabel.setText(String.valueOf(recruiters.size()));
        
        double sum = 0.0;
        for (Recruiter r : recruiters) {
            sum += r.packageLpa;
        }
        double avg = recruiters.isEmpty() ? 0.0 : sum / recruiters.size();
        avgPackageLabel.setText(String.format("%.1f LPA", avg));

        int placedCount = 0;
        for (Student s : students) {
            if ("Allocated".equalsIgnoreCase(s.allocationStatus)) {
                placedCount++;
            }
        }
        placedLabel.setText(String.valueOf(placedCount));
    }

    private void refreshStudentsTable() {
        studentModel.setRowCount(0);
        for (Student s : students) {
            studentModel.addRow(new Object[]{
                    s.id,
                    s.name,
                    s.department,
                    s.cgpa,
                    s.skills,
                    s.allocationStatus
            });
        }
    }

    private void refreshRecruitersTable() {
        recruiterModel.setRowCount(0);
        for (Recruiter r : recruiters) {
            recruiterModel.addRow(new Object[]{
                    r.id,
                    r.name,
                    r.role,
                    r.skills,
                    r.packageLpa,
                    r.capacity
            });
        }
    }

    private void refreshAllocallocationsTable() {
        allocationModel.setRowCount(0);
        int rank = 1;
        for (Allocation a : allocations) {
            allocationModel.addRow(new Object[]{
                    "#" + rank++,
                    a.studentId,
                    a.studentName,
                    a.studentCgpa,
                    a.companyName,
                    a.packageLpa + " LPA"
            });
        }
    }

    /**
     * Executes placement calculations matching priorities to corporate partners
     */
    private void executeAllocationMatchingEngine() {
        allocations.clear();
        for (Student s : students) {
            s.allocationStatus = "Pending";
            s.allocatedCompanyId = null;
        }
        
        for (Recruiter r : recruiters) {
            r.currentFilled = 0;
        }

        // Priority sort (Descending Cumulative CGPA)
        List<Student> sortedStudents = new ArrayList<>(students);
        Collections.sort(sortedStudents, new Comparator<Student>() {
            @Override
            public int compare(Student s1, Student s2) {
                return Double.compare(s2.cgpa, s1.cgpa);
            }
        });

        // Compute alignment loops
        for (Student s : sortedStudents) {
            String stuSkills = s.skills.toLowerCase();
            Recruiter bestMatch = null;
            double maxPackage = -1.0;

            for (Recruiter r : recruiters) {
                if (r.currentFilled < r.capacity) {
                    String[] companyReqs = r.skills.toLowerCase().split(",");
                    boolean isSkillFit = false;
                    for (String req : companyReqs) {
                        if (stuSkills.contains(req.trim())) {
                            isSkillFit = true;
                            break;
                        }
                    }

                    if (isSkillFit && r.packageLpa > maxPackage) {
                        maxPackage = r.packageLpa;
                        bestMatch = r;
                    }
                }
            }

            if (bestMatch != null) {
                bestMatch.currentFilled++;
                s.allocationStatus = "Allocated";
                s.allocatedCompanyId = bestMatch.id;
                allocations.add(new Allocation(
                        s.id,
                        s.name,
                        s.cgpa,
                        s.department,
                        bestMatch.name,
                        bestMatch.packageLpa
                ));
                
                // Track update inside live database records
                updateStudentAllocationInDatabase(s.id, "Allocated", bestMatch.id);
            } else {
                s.allocationStatus = "Standby Status";
                updateStudentAllocationInDatabase(s.id, "Standby Status", null);
            }
        }

        refreshStudentsTable();
        refreshAllocallocationsTable();
        updateUIStats();
    }

    /**
     * Resets priorities allocation
     */
    private void resetAllocationEngine() {
        allocations.clear();
        for (Student s : students) {
            s.allocationStatus = "Pending";
            s.allocatedCompanyId = null;
            updateStudentAllocationInDatabase(s.id, "Pending", null);
        }
        for (Recruiter r : recruiters) {
            r.currentFilled = 0;
        }
        refreshStudentsTable();
        refreshAllocallocationsTable();
        updateUIStats();
        JOptionPane.showMessageDialog(this, "Rosters and assignments reset to Pending coordinates.");
    }

    /**
     * Database transaction pipeline to update allocations
     */
    private void updateStudentAllocationInDatabase(String studentId, String status, String companyId) {
        try (Connection conn = getConnection()) {
            String sql = "UPDATE students SET allocation_status = ?, allocated_company_id = ? WHERE id = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, status);
                ps.setString(2, companyId);
                ps.setString(3, studentId);
                ps.executeUpdate();
            }
        } catch (Exception err) {
            System.err.println("Database allocation sync issue: " + err.getMessage());
        }
    }

    /**
     * Persist newly added student to JDBC database table
     */
    private void addStudentToDatabase(Student s) {
        students.add(s);
        try (Connection conn = getConnection()) {
            String sql = "INSERT INTO students (id, name, department, cgpa, skills, allocation_status, allocated_company_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, s.id);
                ps.setString(2, s.name);
                ps.setString(3, s.department);
                ps.setDouble(4, s.cgpa);
                ps.setString(5, s.skills);
                ps.setString(6, s.allocationStatus);
                ps.setString(7, s.allocatedCompanyId);
                ps.executeUpdate();
            }
        } catch (Exception err) {
            System.err.println("JDBC Save Student failed: " + err.getMessage());
        }
    }

    /**
     * Purge selected student record from database
     */
    private void deleteSelectedStudent() {
        int row = studentTable.getSelectedRow();
        if (row == -1) {
            JOptionPane.showMessageDialog(this, "Select a student row to purge from ledger.");
            return;
        }
        String idToPurge = (String) studentTable.getValueAt(row, 0);
        int confirm = JOptionPane.showConfirmDialog(this, "Are you sure you want to delete profile " + idToPurge + "?", "Confirm Purge", JOptionPane.YES_NO_OPTION);
        if (confirm == JOptionPane.YES_OPTION) {
            students.removeIf(s -> s.id.equalsIgnoreCase(idToPurge));
            
            // Database transaction DELETE
            try (Connection conn = getConnection()) {
                String sql = "DELETE FROM students WHERE id = ?";
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setString(1, idToPurge);
                    ps.executeUpdate();
                }
            } catch (Exception err) {
                System.err.println("JDBC delete student failed: " + err.getMessage());
            }

            executeAllocationMatchingEngine();
        }
    }

    /**
     * Persist newly onboarded corporate partner to database
     */
    private void addRecruiterToDatabase(Recruiter r) {
        recruiters.add(r);
        try (Connection conn = getConnection()) {
            String sql = "INSERT INTO recruiters (id, name, role, skills, package_lpa, capacity) VALUES (?, ?, ?, ?, ?, ?)";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, r.id);
                ps.setString(2, r.name);
                ps.setString(3, r.role);
                ps.setString(4, r.skills);
                ps.setDouble(5, r.packageLpa);
                ps.setInt(6, r.capacity);
                ps.executeUpdate();
            }
        } catch (Exception err) {
            System.err.println("JDBC Onboard Recruiter failed: " + err.getMessage());
        }
    }

    /**
     * Purge recruiter partner from directory table
     */
    private void deleteSelectedRecruiter() {
        int row = recruiterTable.getSelectedRow();
        if (row == -1) {
            JOptionPane.showMessageDialog(this, "Select a recruiter agreement row to revoke.");
            return;
        }
        String idToRevoke = (String) recruiterTable.getValueAt(row, 0);
        int confirm = JOptionPane.showConfirmDialog(this, "Are you sure you want to revoke agreement " + idToRevoke + "?", "Confirm Revocation", JOptionPane.YES_NO_OPTION);
        if (confirm == JOptionPane.YES_OPTION) {
            recruiters.removeIf(r -> r.id.equalsIgnoreCase(idToRevoke));
            
            // Database transaction DELETE
            try (Connection conn = getConnection()) {
                String sql = "DELETE FROM recruiters WHERE id = ?";
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setString(1, idToRevoke);
                    ps.executeUpdate();
                }
            } catch (Exception err) {
                System.err.println("JDBC revoke recruiter failed: " + err.getMessage());
            }

            executeAllocationMatchingEngine();
        }
    }

    private void showRegisterStudentDialog() {
        JDialog dialog = new JDialog(this, "SEC Cadet Registration", true);
        dialog.setSize(350, 400);
        dialog.setLocationRelativeTo(this);
        dialog.setLayout(new BorderLayout());

        JPanel container = new JPanel(new GridLayout(6, 2, 10, 15));
        container.setBorder(new EmptyBorder(20, 20, 20, 20));

        JTextField idF = new JTextField();
        JTextField nameF = new JTextField();
        JTextField deptF = new JTextField("Computer Science");
        JTextField cgpaF = new JTextField("8.5");
        JTextField skillsF = new JTextField("Java, C++");

        container.add(new JLabel("Card Registration ID:"));
        container.add(idF);
        container.add(new JLabel("Full Name:"));
        container.add(nameF);
        container.add(new JLabel("Accredited Dept:"));
        container.add(deptF);
        container.add(new JLabel("Merit GPA [0-10]:"));
        container.add(cgpaF);
        container.add(new JLabel("Skill Portfolios:"));
        container.add(skillsF);

        JButton save = new JButton("Onboard Cadet");
        save.setBackground(INDIGO_PRIMARY);
        save.setForeground(Color.WHITE);
        save.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                try {
                    String id = idF.getText().trim();
                    String name = nameF.getText().trim();
                    String dept = deptF.getText().trim();
                    double cgpa = Double.parseDouble(cgpaF.getText().trim());
                    String skills = skillsF.getText().trim();

                    if (id.isEmpty() || name.isEmpty() || skills.isEmpty()) {
                        JOptionPane.showMessageDialog(dialog, "Complete all inputs!");
                        return;
                    }

                    // Save to database & cache
                    addStudentToDatabase(new Student(id, name, dept, cgpa, skills));
                    
                    executeAllocationMatchingEngine();
                    dialog.dispose();
                } catch (Exception ex) {
                    JOptionPane.showMessageDialog(dialog, "Could not register! Review GPA bounds.");
                }
            }
        });

        dialog.add(container, BorderLayout.CENTER);
        dialog.add(save, BorderLayout.SOUTH);
        dialog.setVisible(true);
    }

    private void showOnboardRecruiterDialog() {
        JDialog dialog = new JDialog(this, "SEC Corporate Partnership Integration", true);
        dialog.setSize(380, 400);
        dialog.setLocationRelativeTo(this);
        dialog.setLayout(new BorderLayout());

        JPanel container = new JPanel(new GridLayout(6, 2, 10, 15));
        container.setBorder(new EmptyBorder(20, 20, 20, 20));

        JTextField idF = new JTextField("REC_" + (recruiters.size() + 1));
        JTextField nameF = new JTextField();
        JTextField roleF = new JTextField("SDE Analyst");
        JTextField packF = new JTextField("6.5");
        JTextField skillsF = new JTextField("Java, SQL");
        JTextField capF = new JTextField("3");

        container.add(new JLabel("Recruiter Partner ID:"));
        container.add(idF);
        container.add(new JLabel("Firm Brand Name:"));
        container.add(nameF);
        container.add(new JLabel("Target Job Role:"));
        container.add(roleF);
        container.add(new JLabel("Annual LPA package:"));
        container.add(packF);
        container.add(new JLabel("Matched Skills Constraints:"));
        container.add(skillsF);
        container.add(new JLabel("Seat Capacity Limits:"));
        container.add(capF);

        JButton save = new JButton("Lock Recruiter Alliance");
        save.setBackground(EMERALD_GREEN);
        save.setForeground(Color.WHITE);
        save.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                try {
                    String id = idF.getText().trim();
                    String name = nameF.getText().trim();
                    String role = roleF.getText().trim();
                    double lpa = Double.parseDouble(packF.getText().trim());
                    String skills = skillsF.getText().trim();
                    int cap = Integer.parseInt(capF.getText().trim());

                    if (name.isEmpty() || skills.isEmpty()) {
                        JOptionPane.showMessageDialog(dialog, "Input fields remain incomplete!");
                        return;
                    }

                    // Save to database & cache
                    addRecruiterToDatabase(new Recruiter(id, name, role, skills, lpa, cap));
                    
                    executeAllocationMatchingEngine();
                    dialog.dispose();
                } catch (Exception ex) {
                    JOptionPane.showMessageDialog(dialog, "Invalid numeric formatting inputs.");
                }
            }
        });

        dialog.add(container, BorderLayout.CENTER);
        dialog.add(save, BorderLayout.SOUTH);
        dialog.setVisible(true);
    }

    public static void main(String[] args) {
        // Run with system Look and Feel
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception e) {
            e.printStackTrace();
        }

        SwingUtilities.invokeLater(() -> {
            new SIMATS_Campus_Placement_System().setVisible(true);
        });
    }

    // Helper entities
    private static class Student {
        String id;
        String name;
        String department;
        double cgpa;
        String skills;
        String allocationStatus = "Pending";
        String allocatedCompanyId = null;

        Student(String id, String name, String department, double cgpa, String skills) {
            this.id = id;
            this.name = name;
            this.department = department;
            this.cgpa = cgpa;
            this.skills = skills;
        }
    }

    private static class Recruiter {
        String id;
        String name;
        String role;
        String skills;
        double packageLpa;
        int capacity;
        int currentFilled = 0;

        Recruiter(String id, String name, String role, String skills, double packageLpa, int capacity) {
            this.id = id;
            this.name = name;
            this.role = role;
            this.skills = skills;
            this.packageLpa = packageLpa;
            this.capacity = capacity;
        }
    }

    private static class Allocation {
        String studentId;
        String studentName;
        double studentCgpa;
        String studentDepartment;
        String companyName;
        double packageLpa;

        Allocation(String sId, String sName, double cgpa, String sDept, String cName, double packageLpa) {
            this.studentId = sId;
            this.studentName = sName;
            this.studentCgpa = cgpa;
            this.studentDepartment = sDept;
            this.companyName = cName;
            this.packageLpa = packageLpa;
        }
    }
}
