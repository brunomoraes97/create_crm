document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('multi-step-form');
    const formSteps = Array.from(document.querySelectorAll('.form-step'));
    const btnNext = document.querySelectorAll('.btn-next');
    const btnPrev = document.querySelectorAll('.btn-prev');
    const progressbar = document.getElementById('progressbar').querySelectorAll('li');
    const addUserBtn = document.getElementById('add-user-btn');
    const userContainer = document.getElementById('user-container');
    const resultDiv = document.getElementById('result');
    const otpGroup = document.getElementById('otp_group');
    const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
    let currentStep = 0;
    let accessToken = '';
    let userCount = 1;

    // Theme Toggle Logic
    // Check for saved theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleCheckbox.checked = true;
    }

    themeToggleCheckbox.addEventListener('change', () => {
        if (themeToggleCheckbox.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });

        // Handle Enter Key Press
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent default form submission
                if (currentStep < formSteps.length - 1) {
                    btnNext[currentStep].click();
                } else if (currentStep === formSteps.length - 1) {
                    form.dispatchEvent(new Event('submit', { 'bubbles': true, 'cancelable': true }));
                }
            }
        });
    
        btnNext.forEach((button) => {
            button.addEventListener('click', async () => {
                if (validateForm()) {
                    if (currentStep === 0) {
                        // Step 1: Attempt Login
                        try {
                            await attemptLogin();
                            proceedToNextStep();
                        } catch (error) {
                            // If error is due to missing OTP, show OTP field
                            if (error.message.includes('OTP required')) {
                                otpGroup.style.display = 'block';
                                document.getElementById('otp').setAttribute('required', 'required');
                                showErrorMessage('Please enter your OTP code.');
                            } else {
                                showErrorMessage(`Error: ${error.message}`);
                            }
                        }
                    } else {
                        proceedToNextStep();
                    }
                }
            });
        });
    
        btnPrev.forEach((button) => {
            button.addEventListener('click', () => {
                formSteps[currentStep].classList.remove('form-step-active');
                progressbar[currentStep].classList.remove('active');
                currentStep--;
                formSteps[currentStep].classList.add('form-step-active');
                progressbar[currentStep].classList.add('active');
                resultDiv.innerHTML = ''; // Clear any previous messages
            });
        });
    
        // Add event listener to the "Add Another User" button
        addUserBtn.addEventListener('click', () => {
            userCount++;
            const userEntry = document.createElement('div');
            userEntry.classList.add('user-entry');
            userEntry.innerHTML = `
                <h3>User ${userCount}</h3>
                <div class="form-group">
                    <label for="first_name_${userCount}">First Name:</label>
                    <input type="text" id="first_name_${userCount}" name="first_name[]" required>
                </div>
                <div class="form-group">
                    <label for="last_name_${userCount}">Last Name:</label>
                    <input type="text" id="last_name_${userCount}" name="last_name[]" required>
                </div>
                <div class="form-group">
                    <label for="user_login_${userCount}">Email Address:</label>
                    <input type="email" id="user_login_${userCount}" name="user_login[]" required>
                </div>
                <div class="form-group">
                    <label for="user_password_${userCount}">Password:</label>
                    <input type="password" id="user_password_${userCount}" name="user_password[]" required>
                </div>
                <div class="form-group">
                    <label for="phone_${userCount}">Phone (include country code):</label>
                    <input type="text" id="phone_${userCount}" name="phone[]">
                </div>
            `;
            userContainer.appendChild(userEntry);
        });
    
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (validateForm()) {
                try {
                    resultDiv.innerHTML = `<p class="success">Processing...</p>`;
                    // Access Token is already obtained in Step 1
    
                    // Step 2: Create Company
                    const companyId = await createCompany(accessToken);
    
                    // Step 3: Create Application
                    const applicationId = await createApplication(accessToken, companyId);
    
                    // Step 4: Create Users and Add to Application
                    const userEntries = document.querySelectorAll('.user-entry');
                    let usersCreated = [];
                    for (let i = 0; i < userEntries.length; i++) {
                        const userEntry = userEntries[i];
                        const first_name = userEntry.querySelector(`[name="first_name[]"]`).value;
                        const last_name = userEntry.querySelector(`[name="last_name[]"]`).value;
                        const user_login = userEntry.querySelector(`[name="user_login[]"]`).value;
                        const user_password = userEntry.querySelector(`[name="user_password[]"]`).value;
                        const phone = userEntry.querySelector(`[name="phone[]"]`).value;
    
                        const userId = await createUser(accessToken, companyId, first_name, last_name, user_login, user_password, phone);
                        const status = await addUserToApplication(accessToken, applicationId, userId);
    
                        if (status === 'ok') {
                            showSuccessMessage(`User ${user_login} created and added to application successfully!`);
                            usersCreated.push({
                                "name": `${first_name} ${last_name}`,
                                "email_address": user_login
                                // Passwords are not included for security reasons
                            });
                        } else {
                            showErrorMessage(`Error creating or adding user ${user_login} to the application.`);
                        }
                    }
    
                    showSuccessMessage(`All users have been processed.`);
    
                    // Send Webhook with the specified data
                    const company_name = document.getElementById('company_name').value;
                    const workspace = document.getElementById('workspace').value;
    
                    const webhookData = {
                        "company": company_name,
                        "crm": `https://${workspace}.irev.com`,
                        "users_created": usersCreated
                    };
    
                    await sendWebhook(webhookData);
    
                } catch (error) {
                    showErrorMessage(`Error: ${error.message}`);
                }
            }
        });
    
        function validateForm() {
            const inputs = formSteps[currentStep].querySelectorAll('input[required], select[required]');
            for (let input of inputs) {
                if (!input.checkValidity()) {
                    input.reportValidity();
                    return false;
                }
            }
            return true;
        }
    
        async function attemptLogin() {
            const login = document.getElementById('login').value;
            const password = document.getElementById('password').value;
            const otp = document.getElementById('otp').value || null;
    
            accessToken = await loginMaster(login, password, otp);
        }
    
        async function loginMaster(login, password, otp) {
            const payload = {
                login: login,
                password: password,
            };
    
            if (otp) {
                payload.token_2fa = otp;
            }
    
            const headers = {
                'Accept': 'application/json',
                'Authorization': 'Bearer None',
                'Content-Type': 'application/json'
            };
    
            const response = await fetch('https://id.irev.com/master/backend/crm/api/v1/auth/login', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });
    
            const data = await response.json();
    
            if (response.ok && data.data && data.data.access_token) {
                return data.data.access_token;
            } else if (data.error && data.error.otp) {
                throw new Error('OTP required');
            } else {
                throw new Error('Login failed. Please check your credentials.');
            }
        }
    
        function proceedToNextStep() {
            formSteps[currentStep].classList.remove('form-step-active');
            progressbar[currentStep].classList.remove('active');
            currentStep++;
            formSteps[currentStep].classList.add('form-step-active');
            progressbar[currentStep].classList.add('active');
            resultDiv.innerHTML = ''; // Clear any previous messages
        }
    
        // Function to display error messages
        function showErrorMessage(message) {
            resultDiv.innerHTML = `<p class="error">${message}</p>`;
        }
    
        // Function to display success messages
        function showSuccessMessage(message) {
            resultDiv.innerHTML += `<p class="success">${message}</p>`;
        }
    
        async function createCompany(accessToken) {
            const company_name = document.getElementById('company_name').value;
            const telegram = document.getElementById('telegram').value;
            const skype = document.getElementById('skype').value;
            const country = document.getElementById('country').value;
            const payment_type = document.getElementById('payment_type').value.toLowerCase();
            const tier = 'basic';
    
            const payload = {
                action: 'Company\\Create',
                repository: 'Eloquent\\CompanyRepository',
                arguments: {
                    name: company_name,
                    telegram: telegram || null,
                    skype: skype || null,
                    country: country,
                    payment_type: payment_type,
                    tier: tier,
                    stage: null,
                    whitelisting_enabled: '0',
                    group_templates: ['1', '2', '7'],
                    sales_manager_id: null,
                    onboarding_manager_id: null,
                    whitelisted_ips: null,
                    active: '1'
                }
            };
    
            const headers = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            };
    
            await fetch('https://id.irev.com/master/backend/crm/api/v1/action/process', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });
    
            // Get Company ID
            const response = await fetch(`https://id.irev.com/master/backend/crm/api/v1/companies?limit=1&page=1&filters%5Bname%5D%5B0%5D=${encodeURIComponent(company_name)}&order_values=None`, {
                method: 'GET',
                headers: headers
            });
    
            const data = await response.json();
            if (data.data && data.data.rows && data.data.rows[0]) {
                return data.data.rows[0].id;
            } else {
                throw new Error('Failed to retrieve Company ID.');
            }
        }
    
        async function createApplication(accessToken, companyId) {
            const application_name = document.getElementById('application_name').value;
            const workspace = document.getElementById('workspace').value;
    
            const payload = {
                action: 'Application\\Create',
                repository: 'Eloquent\\ApplicationRepository',
                arguments: {
                    name: application_name,
                    workspace: workspace,
                    company_id: companyId,
                    type: 'tracking-software',
                    development: '0',
                    initial_template_id: '4',
                    ftd_cost: null,
                    active: '1',
                    deactivation_reason: null,
                    logo: 'https://irev.ams3.digitaloceanspaces.com/master/33829d66.png'
                }
            };
    
            const headers = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            };
    
            await fetch('https://id.irev.com/master/backend/crm/api/v1/action/process', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });
    
            // Get Application ID
            const response = await fetch(`https://id.irev.com/master/backend/crm/api/v1/applications?trashed=false&limit=1&page=1&filters%5Bname%5D%5B0%5D=${encodeURIComponent(application_name)}&order_values=None`, {
                method: 'GET',
                headers: headers
            });
    
            const data = await response.json();
            if (data.data && data.data.rows && data.data.rows[0]) {
                return data.data.rows[0].id;
            } else {
                throw new Error('Failed to retrieve Application ID.');
            }
        }
    
        async function createUser(accessToken, companyId, first_name, last_name, user_login, user_password, phone) {
            const payload = {
                action: 'User\\Create',
                repository: 'Eloquent\\UserRepository',
                arguments: {
                    first_name: first_name,
                    last_name: last_name,
                    login: user_login,
                    password: user_password,
                    email: user_login,
                    phone: phone || null,
                    otp: 'disabled',
                    telegram: null,
                    timezone: 'America/New_York',
                    company_id: companyId,
                    role: '2',
                    groups: ['647'],
                    active: '1',
                    default_filter_type: 'none',
                    default_filter_value: null,
                    default_filter_tracking_provider: null,
                    change_password: '0',
                    ip_whitelisting_enabled: '0',
                    allowed_terms: null,
                    disallowed_terms: null,
                    note: null
                }
            };
    
            const headers = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            };
    
            await fetch('https://id.irev.com/master/backend/crm/api/v1/action/process', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });
    
            // Get User ID
            const response = await fetch(`https://id.irev.com/master/backend/crm/api/v1/users?limit=25&page=1&filters%5Blogin%5D%5B0%5D=${encodeURIComponent(user_login)}&order_values=null`, {
                method: 'GET',
                headers: headers
            });
    
            const data = await response.json();
            if (data.data && data.data.rows && data.data.rows[0]) {
                return data.data.rows[0].id;
            } else {
                throw new Error(`Failed to retrieve User ID for ${user_login}.`);
            }
        }
    
        async function addUserToApplication(accessToken, applicationId, userId) {
            if (!applicationId) {
                throw new Error('No application was created yet.');
            }
    
            const payload = {
                action: 'ApplicationAccess\\Create',
                arguments: {
                    assignee_type: 'User',
                    assignee_id: userId,
                    application_id: applicationId
                },
                repository: 'Eloquent\\ApplicationAccessRepository'
            };
    
            const headers = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            };
    
            const response = await fetch('https://id.irev.com/master/backend/crm/api/v1/action/process', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });
    
            const data = await response.json();
            if (data && data.measure) {
                return 'ok';
            } else {
                return 'not ok';
            }
        }
    
        async function sendWebhook(data) {
            const webhookUrl = 'https://hook.us1.make.com/2kt3im2kimm4u3qz39sedfnepsdo6q4p';
    
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
    
            if (!response.ok) {
                throw new Error('Failed to send webhook.');
            }
        }
    });
    
