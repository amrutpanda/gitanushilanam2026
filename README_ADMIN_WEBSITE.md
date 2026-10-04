# Gitanushilanam Admin Website Files

Copy these files into your existing website while keeping your current folder structure:

```text
/
├── index.html
├── registration.html
├── admin-login.html       <- new
├── admin.html             <- new
├── css/
│   └── admin.css          <- new
└── js/
    ├── admin-login.js     <- new
    └── admin.js           <- new
```

Your existing `index.html`, `registration.html`, registration CSS and registration JS do not need to be replaced by this package.

Production admin URLs:

```text
https://gitanushilanam.net/admin-login.html
https://gitanushilanam.net/admin.html
```

After successful login the browser redirects to `admin.html`. If the session is missing or expired, `admin.html` redirects back to `admin-login.html`.

The dashboard shows 30 records per page and supports search, competition, country and state filtering.
