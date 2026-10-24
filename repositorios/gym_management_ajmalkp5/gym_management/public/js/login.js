// document.addEventListener("DOMContentLoaded", function () {

//     const loginForm = document.getElementById("loginForm");

//     loginForm.addEventListener("submit", async function (e) {

//         e.preventDefault();

//         const email = document.getElementById("email").value.trim();
//         const password = document.getElementById("password").value.trim();

//         if (!email || !password) {
//             alert("Email and Password required");
//             return;
//         }

//         try {

//             const response = await fetch(
//                 "/api/method/gym_management.web_api.login.login_user",
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json"
//                     },
//                     body: JSON.stringify({
//                         email: email,
//                         password: password
//                     })
//                 }
//             );

//             const data = await response.json();

//             console.log("API RESPONSE:", data);

//             const result = data.message || data;

//             if (!result) {
//                 alert("Invalid server response");
//                 return;
//             }

//             // SUCCESS LOGIN
//             if (result.status === "success") {

//                 alert(result.message);

//                 window.location.href = "/";

//             }

//             // NO ACCOUNT → REGISTER
//             else if (result.status === "register") {

//                 alert(result.message);

//                 window.location.href = "/register";

//             }

//             // WRONG PASSWORD
//             else if (result.status === "invalid_password") {

//                 alert(result.message);

//             }

//             // ERROR
//             else {

//                 alert(result.message || "Something went wrong");

//             }

//         }

//         catch (error) {

//             console.error("Login Error:", error);

//             alert("Server error");

//         }

//     });

// });