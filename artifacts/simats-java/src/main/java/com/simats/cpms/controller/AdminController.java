package com.simats.cpms.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import jakarta.servlet.http.HttpSession;
import java.util.ArrayList;
import java.util.List;

@Controller
public class AdminController {

    @GetMapping("/")
    public String showMainPage(HttpSession session) {
        if (session.getAttribute("adminLogged") != null) {
            return "redirect:/dashboard";
        }
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String showLoginForm(HttpSession session) {
        if (session.getAttribute("adminLogged") != null) {
            return "redirect:/dashboard";
        }
        return "login";
    }

    @PostMapping("/login")
    public String handleLogin(
            @RequestParam String username,
            @RequestParam String password,
            HttpSession session,
            Model model) {
        
        if ("192472118".equals(username.trim()) && "2118".equals(password.trim())) {
            session.setAttribute("adminLogged", "true");
            return "redirect:/dashboard";
        }
        
        model.addAttribute("error", "Invalid Placement Coordinator credentials. Please try again.");
        return "login";
    }

    @GetMapping("/dashboard")
    public String showDashboard(HttpSession session, Model model) {
        if (session.getAttribute("adminLogged") == null) {
            return "redirect:/login";
        }
        
        // Populate standard mock data corresponding to database fallbacks
        List<MockStudent> list = new ArrayList<>();
        list.add(new MockStudent("192472118", "Pradeep Kumar", "Computer Science", 9.42, "Allocated", "Microsoft"));
        list.add(new MockStudent("192472005", "Arun Karthik", "Information Technology", 8.85, "Allocated", "Zoho"));
        list.add(new MockStudent("192472012", "Ram Prakash", "Biotech", 7.90, "Pending", "—"));
        list.add(new MockStudent("192472091", "Divya Pillai", "Electronics", 8.21, "Pending", "—"));
        
        model.addAttribute("students", list);
        return "dashboard";
    }

    @GetMapping("/logout")
    public String handleLogout(HttpSession session) {
        session.invalidate();
        return "redirect:/login";
    }

    public static class MockStudent {
        private String id;
        private String name;
        private String department;
        private double cgpa;
        private String status;
        private String company;

        public MockStudent(String id, String name, String department, double cgpa, String status, String company) {
            this.id = id;
            this.name = name;
            this.department = department;
            this.cgpa = cgpa;
            this.status = status;
            this.company = company;
        }

        public String getId() { return id; }
        public String getName() { return name; }
        public String getDepartment() { return department; }
        public double getCgpa() { return cgpa; }
        public String getStatus() { return status; }
        public String getCompany() { return company; }
    }
}
