// App State Management
let currentUser = null;
let notifications = [];
let allNotifications = []; // Store all notifications for search
let reports = [];
let salaryData = [];
let expensesData = [];
let performanceData = [];
let isDarkMode = false;
let searchQuery = '';
let activeFilter = 'all';
let isSearchVisible = false;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Refresh notifications function
async function refreshNotifications() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.classList.add('rotating');
        refreshBtn.disabled = true;
    }

    try {
        await loadNotificationsFromDB();
        showMessage('تم تحديث الإشعارات بنجاح', 'success');
    } catch (error) {
        console.error('Error refreshing notifications:', error);
        showMessage('حدث خطأ أثناء تحديث الإشعارات', 'error');
    }

    if (refreshBtn) {
        setTimeout(() => {
            refreshBtn.classList.remove('rotating');
            refreshBtn.disabled = false;
        }, 1000);
    }
}

function initializeApp() {
    // Check for saved login first
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        hideLoadingScreen();
        showMainPage();
    } else {
        // Show loading screen only if not logged in
        setTimeout(() => {
            hideLoadingScreen();
        }, 2000);
    }

    // Check for saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode();
    }
}



function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 500);
}

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Change password form
    document.getElementById('changePasswordForm').addEventListener('submit', handleChangePassword);

    // Change phone form
    document.getElementById('changePhoneForm').addEventListener('submit', handleChangePhone);

    // New report form
    document.getElementById('newReportForm').addEventListener('submit', handleNewReport);

    // Notification form
    document.getElementById('notificationForm').addEventListener('submit', handleNewNotification);

    // Close modal on overlay click
    document.getElementById('modalOverlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();

    const fileNumber = document.getElementById('fileNumber').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const password = document.getElementById('password').value;
    const stayLoggedIn = document.getElementById('stayLoggedIn').checked;
    const rememberData = document.getElementById('rememberData').checked;

    if (fileNumber && phoneNumber && password) {
        showLoadingButton('.login-btn');

        try {
            const user = await window.supabaseDb.authenticateUser(fileNumber, phoneNumber, password);

            if (user) {
                currentUser = {
                    id: user.id,
                    fileNumber: user.file_number,
                    phoneNumber: user.phone_number,
                    name: user.name,
                    branch: user.branch,
                    department: user.department,
                    isAdmin: user.is_admin
                };

                if (stayLoggedIn) {
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }

                if (rememberData) {
                    localStorage.setItem('rememberedData', JSON.stringify({
                        fileNumber: fileNumber,
                        phoneNumber: phoneNumber
                    }));
                }

                showMainPage();
                await loadNotificationsFromDB();
            } else {
                showMessage('بيانات الدخول غير صحيحة', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('حدث خطأ أثناء تسجيل الدخول', 'error');
        }

        hideLoadingButton('.login-btn');
    }
}

function showMainPage() {
    // Hide login page completely
    document.getElementById('loginPage').style.display = 'none';

    showPage('mainPage');
    updateUserInfo();
    loadNotifications();

    // Show admin nav item if user is admin
    if (currentUser && currentUser.isAdmin) {
        document.querySelectorAll('[id^="adminNavItem"]').forEach(item => {
            item.style.display = 'flex';
        });
    }
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userFileNumber').textContent = currentUser.fileNumber;
        document.getElementById('userBranch').textContent = currentUser.branch;
        document.getElementById('userDepartment').textContent = currentUser.department;
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');

    // Show login page again
    document.getElementById('loginPage').style.display = 'flex';
    showPage('loginPage');

    // Hide admin nav items
    document.querySelectorAll('[id^="adminNavItem"]').forEach(item => {
        item.style.display = 'none';
    });
}

// Page Navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    document.getElementById(pageId).classList.add('active');

    // Update navigation
    updateNavigation(pageId);
}

function updateNavigation(pageId) {
    // Remove active class from all navigation items in all navigation bars
    document.querySelectorAll('.navigation-bar .nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Map page IDs to navigation index
    const pageToNavMap = {
        'mainPage': 0,
        'salaryPage': 1,
        'expensesPage': 2,
        'performancePage': 3,
        'profilePage': 4,
        'adminPage': 5
    };

    // Update all navigation bars
    document.querySelectorAll('.navigation-bar').forEach(navBar => {
        const navItems = navBar.querySelectorAll('.nav-item');
        const activeIndex = pageToNavMap[pageId];
        if (activeIndex !== undefined && navItems[activeIndex]) {
            navItems[activeIndex].classList.add('active');
        }
    });
}

// Search and Filter Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedSearch = debounce((query) => {
    searchQuery = query.toLowerCase();
    filterNotifications();
}, 300);

function toggleSearch() {
    isSearchVisible = !isSearchVisible;
    const searchControls = document.getElementById('searchControls');
    const searchToggle = document.getElementById('searchToggle');

    if (isSearchVisible) {
        searchControls.style.display = 'flex';
        // Force reflow before adding active class
        searchControls.offsetHeight;
        searchControls.classList.add('active');
        searchToggle.innerHTML = '<i class="fas fa-times"></i>';
        searchToggle.style.background = 'var(--accent-color)';

        setTimeout(() => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }, 350);
    } else {
        searchControls.classList.remove('active');
        searchToggle.innerHTML = '<i class="fas fa-search"></i>';
        searchToggle.style.background = 'var(--primary-color)';

        setTimeout(() => {
            searchControls.style.display = 'none';
        }, 300);

        clearSearch();
    }
}

function handleSearchInput(event) {
    const query = event.target.value;
    const clearBtn = document.getElementById('clearSearch');

    if (query.length > 0) {
        clearBtn.classList.add('visible');
    } else {
        clearBtn.classList.remove('visible');
    }

    debouncedSearch(query);
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');

    if (searchInput) {
        searchInput.value = '';
    }
    if (clearBtn) {
        clearBtn.classList.remove('visible');
    }

    searchQuery = '';
    activeFilter = 'all';

    // Reset filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('[onclick="filterByType(\'all\')"]').classList.add('active');

    filterNotifications();
}

function filterByType(type) {
    activeFilter = type;

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="filterByType('${type}')"]`).classList.add('active');

    filterNotifications();
}

function filterNotifications() {
    let filteredNotifications = [...allNotifications];

    // Apply search filter
    if (searchQuery) {
        filteredNotifications = filteredNotifications.filter(notification =>
            notification.title.toLowerCase().includes(searchQuery) ||
            notification.content.toLowerCase().includes(searchQuery)
        );
    }

    // Apply type filter
    if (activeFilter !== 'all') {
        filteredNotifications = filteredNotifications.filter(notification =>
            notification.type === activeFilter
        );
    }

    notifications = filteredNotifications;
    displayNotifications();
    updateSearchResults();
}

function updateSearchResults() {
    const resultsInfo = document.getElementById('searchResultsInfo');
    const totalCount = allNotifications.length;
    const filteredCount = notifications.length;

    if (searchQuery || activeFilter !== 'all') {
        resultsInfo.style.display = 'block';
        resultsInfo.textContent = `عرض ${filteredCount} من ${totalCount} إشعار`;
    } else {
        resultsInfo.style.display = 'none';
    }
}

// Skeleton Loading Functions
function showSkeletonNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    notificationsList.innerHTML = '';

    for (let i = 0; i < 3; i++) {
        const skeletonElement = createSkeletonNotification();
        notificationsList.appendChild(skeletonElement);
    }
}

function createSkeletonNotification() {
    const div = document.createElement('div');
    div.className = 'skeleton-notification';

    div.innerHTML = `
        <div class="skeleton-header">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-type"></div>
        </div>
        <div class="skeleton skeleton-content"></div>
        <div class="skeleton skeleton-content short"></div>
        <div class="skeleton skeleton-time"></div>
    `;

    return div;
}

function showSkeletonSalaryData() {
    const monthsList = document.getElementById('salaryMonths');
    monthsList.innerHTML = '';

    for (let i = 0; i < 4; i++) {
        const skeletonElement = document.createElement('div');
        skeletonElement.className = 'skeleton skeleton-month';
        monthsList.appendChild(skeletonElement);
    }
}

function showSkeletonExpensesData() {
    const datesList = document.getElementById('expensesDates');
    datesList.innerHTML = '';

    for (let i = 0; i < 4; i++) {
        const skeletonElement = document.createElement('div');
        skeletonElement.className = 'skeleton skeleton-date';
        datesList.appendChild(skeletonElement);
    }
}

// Notifications
async function loadNotificationsFromDB() {
    showSkeletonNotifications();

    try {
        const dbNotifications = await window.supabaseDb.getNotifications();
        allNotifications = dbNotifications.map(notif => ({
            id: notif.id,
            title: notif.title,
            content: notif.content,
            type: notif.type,
            timestamp: new Date(notif.created_at)
        }));

        // Apply current filters
        filterNotifications();
    } catch (error) {
        console.error('Error loading notifications:', error);
        showMessage('حدث خطأ في تحميل الإشعارات من قاعدة البيانات', 'error');
        allNotifications = [];
        filterNotifications();
    }
}

function loadNotifications() {
    loadNotificationsFromDB();
}

function displayNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    notificationsList.innerHTML = '';

    if (notifications.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
            <i class="fas fa-search"></i>
            <p>لا توجد إشعارات تطابق البحث</p>
        `;
        notificationsList.appendChild(noResults);
        return;
    }

    notifications.forEach((notification, index) => {
        const notificationElement = createNotificationElement(notification);
        notificationElement.classList.add('fade-in');
        notificationElement.style.animationDelay = `${index * 0.1}s`;
        notificationsList.appendChild(notificationElement);
    });
}

function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = 'notification-item';
    div.onclick = () => handleNotificationClick(notification);

    const timeAgo = getTimeAgo(notification.timestamp);

    div.innerHTML = `
        <div class="notification-header">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-type ${notification.type}">${notification.type}</div>
        </div>
        <div class="notification-content">${notification.content}</div>
        <div class="notification-time">${timeAgo}</div>
    `;

    return div;
}

function handleNotificationClick(notification) {
    // Navigate based on type
    switch (notification.type) {
        case 'رواتب':
            showPage('salaryPage');
            break;
        case 'مصروفات':
            showPage('expensesPage');
            break;
        case 'عام':
            // No action for general notifications
            break;
    }
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
        return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
    } else if (hours > 0) {
        return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
    } else {
        return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
    }
}

// Salary Functions
async function showSalaryData() {
    showModal('salaryModal');
    showSkeletonSalaryData();

    try {
        if (currentUser && currentUser.fileNumber) {
            console.log('Loading salary data for user:', currentUser.fileNumber);
            const dbSalaryData = await window.supabaseDb.getSalaryData(currentUser.fileNumber);

            salaryData = dbSalaryData.map(salary => ({
                month: salary.month,
                amount: salary.net_salary || salary.total_allowances || 0,
                payer: salary.payer,
                ...salary // Include all salary details for breakdown
            }));

            console.log('Processed salary data:', salaryData);
        }
    } catch (error) {
        console.error('Error loading salary data:', error);
    }

    // Wait a bit to show loading state
    setTimeout(() => {
        const monthsList = document.getElementById('salaryMonths');
        monthsList.innerHTML = '';

        if (salaryData.length === 0) {
            monthsList.innerHTML = '<div class="no-data">لا توجد بيانات رواتب متاحة</div>';
        } else {
            salaryData.forEach((salary, index) => {
                const monthElement = document.createElement('div');
                monthElement.className = 'month-item slide-in';
                monthElement.style.animationDelay = `${index * 0.1}s`;
                monthElement.textContent = salary.month;
                monthElement.onclick = () => showSalaryDetails(salary);
                monthsList.appendChild(monthElement);
            });
        }
    }, 500);
}

function showSalaryDetails(salary) {
    showSalaryBreakdown(salary);
}

function showSalaryBreakdown(salary) {
    closeModal();

    const modalOverlay = document.getElementById('modalOverlay');
    const modal = document.createElement('div');
    modal.id = 'salaryBreakdownModal';
    modal.className = 'modal';

    // Build allowances details
    let allowancesDetails = '';
    const allowanceFields = [
        { key: 'basic_salary', label: 'الراتب الأساسي' },
        { key: 'variable_salary', label: 'الراتب المتغير' },
        { key: 'allowances', label: 'بدلات الوظيفة' },
        { key: 'profit_share', label: 'توزيع الأرباح' },
        { key: 'experience_allowance', label: 'حافز الخبرة' },
        { key: 'efficiency_allowance', label: 'تقرير الكفاءة' },
        { key: 'mobile_allowance', label: 'بدل الموبايل' },
        { key: 'temporary_level_allowance', label: 'بدل المستوى المؤقت' },
        { key: 'delegation_allowance', label: 'بدل انتداب' },
        { key: 'basic_salary_perctg', label: 'اضافى مخازن' },
        { key: 'special_allowance_new', label: 'بدل الخاص (جديد)' },
        { key: 'sales_fixed_bonus', label: 'مكافأة المبيعات الثابتة' },
        { key: 'supervision_allowance', label: 'بدل الإشراف' },
        { key: 'transportation_allowance_5', label: 'بدل مواصلات' },
        { key: 'medical_insurance_allowance', label: 'بدل التأمين الطبي' },
        { key: 'car_allowance_loan', label: 'بدل قرض السيارة' },
        { key: 'car_allowance', label: 'بدل السيارة' },
        { key: 'gasoline_allowance', label: 'بدل البنزين' },
        { key: 'maintenance_allowance', label: 'بدل الصيانة' },
        { key: 'internet_allowance', label: 'بدل انترنت' },
        { key: 'insurance_allowance', label: 'بدل التأمين' },
        { key: 'alination_housing_allowance', label: 'بدل اغتراب والسكن' },
        { key: 'grading_difference', label: 'فرق الدرجة الوظيفية' },
        { key: 'laptop_allowance', label: 'بدل لابتوب' },
        { key: 'salary_structure', label: 'بدل هيكل الرواتب' },
        { key: 'delegation_for_transfer', label: 'بدل انتداب للنقل' },
        { key: 'special_job_offer_allowance', label: 'عرض عمل خاص' },
        { key: 'enrichment_allowance', label: 'بدل ترقية بينية' },
        { key: 'achievement_allowance', label: 'تحقيق الفرع' },
        { key: 'outsource_allowance', label: 'بدل خارجى' },
        { key: 'workers_families_allowance', label: 'بدل دعم اسر العاملين' },
        { key: 'disable_profit_share', label: 'توزيع ارباح' },
        { key: 'certificate_allowance', label: 'بدل الدرجة العلمية' },
        { key: 'branch_special_allowance', label: 'بدل خاص للفرع' },
        { key: 'annual_level_allowance', label: 'بدل التطوير' },
        { key: 'extra_efficiency_allowance', label: 'تقرير الكفاءة الاضافى' }
    ];

    allowanceFields.forEach(field => {
        const value = salary[field.key] || 0;
        if (value > 0) {
            allowancesDetails += `
                <div class="breakdown-item">
                    <span>${field.label}:</span>
                    <span>${value} ج.م</span>
                </div>
            `;
        }
    });

    // Build deductions details
    let deductionsDetails = '';
    const deductionFields = [
        { key: 'medical_insurance_deduction', label: 'خصم التأمين الطبي' },
        { key: 'family_medical_deduction', label: 'خصم التأمين الطبي (للاسر)' },
        { key: 'mobile_deduction', label: 'خصم موبايل' },
        { key: 'traffic_deduction', label: 'خصم المرور' },
        { key: 'device_deduction', label: 'خصم الجهاز' },
        { key: 'khazna_deduction', label: 'خصم الخزنة' },
        { key: 'trip_instalment', label: 'خصم سلفة رحلة' },
        { key: 'education_instalment', label: 'خصم سلفة التعليمية' },
        { key: 'equipment_instalment', label: 'خصم قسط المعدات' },
        { key: 'ee_social_insurance', label: 'خصم التامينات الاجتماعية' },
        { key: 'attendance_deductions', label: 'خصومات حضور وانصراف' },
        { key: 'other_deductions', label: 'خصومات أخرى' }
    ];

    deductionFields.forEach(field => {
        const value = salary[field.key] || 0;
        if (value > 0) {
            deductionsDetails += `
                <div class="breakdown-item deduction">
                    <span>${field.label}:</span>
                    <span>-${value} ج.م</span>
                </div>
            `;
        }
    });

    modal.innerHTML = `
        <div class="modal-header">
            <h3><i class="fas fa-money-bill-wave"></i> تفاصيل راتب ${salary.month}</h3>
            <span class="close-btn" onclick="closeSalaryBreakdown()">&times;</span>
        </div>
        <div class="modal-content">
            <div class="salary-breakdown">
                <h4>المستحقات:</h4>
                ${allowancesDetails}
                <div class="breakdown-total">
                    <span>إجمالي المستحقات:</span>
                    <span>${salary.total_allowances || 0} ج.م</span>
                </div>
                
                ${deductionsDetails ? '<h4 style="margin-top: 20px;">الخصومات:</h4>' + deductionsDetails : ''}
                
                ${deductionsDetails ? `<div class="breakdown-total deduction">
                    <span>إجمالي الخصومات:</span>
                    <span>-${salary.total_deductions || 0} ج.م</span>
                </div>` : ''}
                
                <div class="breakdown-total net-salary">
                    <span>صافي الراتب:</span>
                    <span>${salary.net_salary || salary.total_allowances || 0} ج.م</span>
                </div>
                <div class="payer-info">
                    <span>جهة الصرف: ${salary.payer}</span>
                </div>
            </div>
        </div>
    `;

    modalOverlay.appendChild(modal);
    showModal('salaryBreakdownModal');
}

function closeSalaryBreakdown() {
    const modal = document.getElementById('salaryBreakdownModal');
    if (modal) {
        modal.remove();
    }
    // Return to salary modal
    showModal('salaryModal');
}

// Expenses Functions
async function showExpensesData() {
    showModal('expensesModal');
    showSkeletonExpensesData();

    try {
        if (currentUser && currentUser.fileNumber) {
            console.log('Loading expenses data for user:', currentUser.fileNumber);
            const dbExpensesData = await window.supabaseDb.getExpensesData(currentUser.fileNumber);

            expensesData = dbExpensesData.map(expense => ({
                date: expense.expense_date,
                amount: expense.net_amount || expense.total_allowances || 0,
                payer: expense.payer,
                description: expense.description,
                ...expense // Include all expense details for breakdown
            }));

            console.log('Processed expenses data:', expensesData);
        }
    } catch (error) {
        console.error('Error loading expenses data:', error);
    }

    // Wait a bit to show loading state
    setTimeout(() => {
        const datesList = document.getElementById('expensesDates');
        datesList.innerHTML = '';

        if (expensesData.length === 0) {
            datesList.innerHTML = '<div class="no-data">لا توجد بيانات مصروفات متاحة</div>';
        } else {
            expensesData.forEach((expense, index) => {
                const dateElement = document.createElement('div');
                dateElement.className = 'date-item slide-in';
                dateElement.style.animationDelay = `${index * 0.1}s`;
                dateElement.textContent = formatDate(expense.date);
                dateElement.onclick = () => showExpensesDetails(expense);
                datesList.appendChild(dateElement);
            });
        }
    }, 500);
}

function showExpensesDetails(expense) {
    showExpensesBreakdown(expense);
}

function showExpensesBreakdown(expense) {
    // Create separate modal for expenses breakdown
    const modalOverlay = document.getElementById('modalOverlay');

    // Remove existing breakdown modal if exists
    const existingModal = document.getElementById('expensesBreakdownModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create new breakdown modal
    const modal = document.createElement('div');
    modal.id = 'expensesBreakdownModal';
    modal.className = 'modal';

    // Build allowances details for expenses
    let allowancesDetails = '';
    const allowanceFields = [
        { key: 'efficiency_report_pharm', label: 'تقرير الكفاءة' },
        { key: 'sales_fixed_bonus', label: 'مكافأة المبيعات' },
        { key: 'distribution_reward', label: 'مكافأة التوزيع' },
        { key: 'achievement_allowance', label: 'مكافات تحقيق الفرع' },
        { key: 'prep_bonus', label: 'مكافاة التحضير' },
        { key: 'sales_variable_commission', label: 'عمولة المبيعات' },
        { key: 'sales_special_bonus', label: 'مكافأة خاصة' },
        { key: 'committee_inv_allowance_1', label: 'حوافز شركات' },
        { key: 'quarter_efficiency_pharma', label: 'كفاءة كوارتر' },
        { key: 'ramadan_iftar', label: 'افطار رمضان' },
        { key: 'ramadan_suhoor', label: 'سحور رمضان' },
        { key: 'eid_ramadan_gift', label: 'منحة العيد' },
        { key: 'meal_allowance_manual', label: 'بدل وجبة' },
        { key: 'travel_allowance_night', label: 'بدل السفر (ذهاب وعودة)' },
        { key: 'travel_allowance_day', label: 'بدل السفر (مبيت)' },
        { key: 'internal_transportation', label: 'بدل انتقالات الداخلي' },
        { key: 'incentives_of_companies', label: 'حوافز الشركات' },
        { key: 'adjustments_salaries', label: 'تسويات' },
        { key: 'holidays_allowance', label: 'بدل راحة' },
        { key: 'travel_transportation', label: 'انتقالات السفر' },
        { key: 'hotel_cost', label: 'فاتورة الفندق' },
        { key: 'fourth_shift', label: 'الدورة الرابعة' },
        { key: 'over_time_manual', label: 'الاضافى' },
        { key: 'mission_allowance', label: 'بدل مامورية' },
        { key: 'internal_travel_transport', label: 'بدل انتقالات الداخلي اثناء السفر' },
        { key: 'other_variable_commission', label: 'عمولات متغيرة اخرى' },
        { key: 'other_special_bonus', label: 'مكافأة خاصة' },
        { key: 'quarter_bonus', label: 'مكافاة الكوارتر' },
        { key: 'private_car_travel_allowance', label: 'بدل السفر بسيارة خاصة' },
        { key: 'point_sales_bonus', label: 'مكافأة نقاط مبيعات' },
        { key: 'extra_efficiency_allowance', label: 'تقرير كفاءة اضافى' }
    ];

    allowanceFields.forEach(field => {
        const value = expense[field.key] || 0;
        if (value > 0) {
            allowancesDetails += `
                <div class="breakdown-item">
                    <span>${field.label}:</span>
                    <span>${value} ج.م</span>
                </div>
            `;
        }
    });

    // Build deductions details for expenses
    let deductionsDetails = '';
    const deductionFields = [
        { key: 'point_sales_deduction', label: 'خصم نقاط المبيعات' },
        { key: 'sales_return_deduction', label: 'خصم مرتد' },
        { key: 'other_deductions', label: 'خصومات أخرى' },
        { key: 'attendance_deductions', label: 'خصم حضور وانصراف' }
    ];

    deductionFields.forEach(field => {
        const value = expense[field.key] || 0;
        if (value > 0) {
            deductionsDetails += `
                <div class="breakdown-item deduction">
                    <span>${field.label}:</span>
                    <span>-${value} ج.م</span>
                </div>
            `;
        }
    });

    modal.innerHTML = `
        <div class="modal-header">
            <h3><i class="fas fa-receipt"></i> تفاصيل المصروفات - ${formatDate(expense.date)}</h3>
            <span class="close-btn" onclick="closeExpensesBreakdown()">&times;</span>
        </div>
        <div class="modal-content">
            <div class="expenses-breakdown">
                <h4>المستحقات:</h4>
                ${allowancesDetails}
                <div class="breakdown-total">
                    <span>إجمالي المستحقات:</span>
                    <span>${expense.total_allowances || 0} ج.م</span>
                </div>
                
                ${deductionsDetails ? '<h4 style="margin-top: 20px;">الخصومات:</h4>' + deductionsDetails : ''}
                
                ${deductionsDetails ? `<div class="breakdown-total deduction">
                    <span>إجمالي الخصومات:</span>
                    <span>-${expense.total_deductions || 0} ج.م</span>
                </div>` : ''}
                
                <div class="breakdown-total net-salary">
                    <span>صافي المصروفات:</span>
                    <span>${expense.net_amount || expense.total_allowances || 0} ج.م</span>
                </div>
                <div class="payer-info">
                    <span>جهة الصرف: ${expense.payer}</span>
                    ${expense.description ? `<br><span>الوصف: ${expense.description}</span>` : ''}
                </div>
            </div>
        </div>
    `;

    modalOverlay.appendChild(modal);
    showModal('expensesBreakdownModal');
}

function closeExpensesBreakdown() {
    const modal = document.getElementById('expensesBreakdownModal');
    if (modal) {
        modal.remove();
    }
    // Return to expenses modal
    showModal('expensesModal');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Profile Functions
function showPasswordModal() {
    showModal('accountModal');
    showTab('passwordTab');
}

function showReportModal() {
    showModal('reportModal');
    showTab('newReportTab');
    loadReportsHistory();
}

async function handleChangePassword(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const currentPassword = e.target.querySelector('input[placeholder="كلمة المرور الحالية"]').value;
    const newPassword = e.target.querySelector('input[placeholder="كلمة المرور الجديدة"]').value;
    const confirmPassword = e.target.querySelector('input[placeholder="تأكيد كلمة المرور الجديدة"]').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }

    showLoadingButton('#changePasswordForm button[type="submit"]');

    try {
        if (currentUser && currentUser.id) {
            const success = await window.supabaseDb.updateUserPassword(
                currentUser.id,
                currentPassword,
                newPassword
            );

            if (success) {
                showMessage('تم تغيير كلمة المرور بنجاح', 'success');
                e.target.reset();
                closeModal();
            }
        } else {
            throw new Error('المستخدم غير متصل');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showMessage('حدث خطأ أثناء تغيير كلمة المرور: ' + error.message, 'error');
    }

    hideLoadingButton('#changePasswordForm button[type="submit"]');
}

async function handleChangePhone(e) {
    e.preventDefault();

    const newPhoneNumber = e.target.querySelector('input[placeholder="رقم الهاتف الجديد"]').value;

    if (!newPhoneNumber) {
        showMessage('يرجى إدخال رقم الهاتف الجديد', 'error');
        return;
    }

    // Validate phone number format (Egyptian mobile numbers)
    const phoneRegex = /^(010|011|012|015)\d{8}$/;
    if (!phoneRegex.test(newPhoneNumber)) {
        showMessage('يرجى إدخال رقم هاتف صحيح (مثال: 01012345678)', 'error');
        return;
    }

    showLoadingButton('#changePhoneForm button[type="submit"]');

    try {
        if (currentUser && currentUser.id) {
            const updatedUser = await window.supabaseDb.updateUserPhone(
                currentUser.id,
                newPhoneNumber
            );

            if (updatedUser) {
                // Update current user data
                currentUser.phoneNumber = newPhoneNumber;

                // Update localStorage if user is staying logged in
                const savedUser = localStorage.getItem('currentUser');
                if (savedUser) {
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }

                showMessage('تم تغيير رقم الهاتف بنجاح', 'success');
                e.target.reset();
                closeModal();
            }
        } else {
            throw new Error('المستخدم غير متصل');
        }
    } catch (error) {
        console.error('Error changing phone:', error);
        showMessage('حدث خطأ أثناء تغيير رقم الهاتف: ' + error.message, 'error');
    }

    hideLoadingButton('#changePhoneForm button[type="submit"]');
}

async function handleNewReport(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const title = formData.get('title') || e.target.querySelector('input').value;
    const content = formData.get('content') || e.target.querySelector('textarea').value;

    if (title && content && currentUser && currentUser.id) {
        showLoadingButton('#newReportForm button[type="submit"]');

        try {
            console.log('Attempting to create report:', { title, content, userId: currentUser.id });
            const result = await window.supabaseDb.createReport(currentUser.id, title, content);

            if (result) {
                showMessage('تم إرسال البلاغ بنجاح', 'success');
                e.target.reset();
                await loadReportsHistory();
            } else {
                showMessage('فشل في إرسال البلاغ', 'error');
            }
        } catch (error) {
            console.error('Error creating report:', error);
            showMessage('حدث خطأ أثناء إرسال البلاغ: ' + error.message, 'error');
        }

        hideLoadingButton('#newReportForm button[type="submit"]');
    } else {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
    }
}

async function loadReportsHistory() {
    try {
        if (currentUser && currentUser.id) {
            const dbReports = await window.supabaseDb.getUserReports(currentUser.id);
            reports = dbReports.map(report => ({
                id: report.id,
                title: report.title,
                content: report.content,
                status: report.status,
                date: new Date(report.created_at)
            }));
        }
    } catch (error) {
        console.error('Error loading reports history:', error);
    }

    const reportsHistory = document.getElementById('reportsHistory');
    reportsHistory.innerHTML = '';

    reports.forEach(report => {
        const reportElement = createReportElement(report);
        reportsHistory.appendChild(reportElement);
    });
}

function createReportElement(report) {
    const div = document.createElement('div');
    div.className = 'report-item';

    const statusText = {
        'pending': 'في الانتظار',
        'in-progress': 'جاري العمل عليها',
        'resolved': 'تم الحل'
    };

    div.innerHTML = `
        <div class="report-header">
            <div class="report-title">${report.title}</div>
            <div class="report-status ${report.status}">${statusText[report.status]}</div>
        </div>
        <div class="report-content">${report.content}</div>
        <div class="report-date">${formatDate(report.date.toISOString().split('T')[0])}</div>
    `;

    return div;
}

// Admin Functions
function showNotificationForm() {
    showModal('notificationFormModal');
    // لا نحتاج لتحميل الإشعارات هنا، فقط عرض النموذج
}

async function handleNewNotification(e) {
    e.preventDefault();

    const title = document.getElementById('notificationTitle').value;
    const content = document.getElementById('notificationContent').value;
    const type = document.getElementById('notificationType').value;

    if (title && content && type) {
        showLoadingButton('#notificationForm button[type="submit"]');

        try {
            console.log('Attempting to create notification:', { title, content, type });
            const result = await window.supabaseDb.createNotification(title, content, type);

            if (result) {
                showMessage('تم إضافة الإشعار بنجاح', 'success');
                document.getElementById('notificationForm').reset();
                closeModal();

                // Reload notifications from database
                await loadNotificationsFromDB();
            } else {
                showMessage('فشل في إضافة الإشعار', 'error');
            }
        } catch (error) {
            console.error('Error creating notification:', error);
            showMessage('حدث خطأ أثناء إضافة الإشعار: ' + error.message, 'error');
        }

        hideLoadingButton('#notificationForm button[type="submit"]');
    } else {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
    }
}

function loadAdminNotifications() {
    const adminNotificationsList = document.getElementById('adminNotificationsList');
    if (!adminNotificationsList) return;
    
    adminNotificationsList.innerHTML = '';

    notifications.forEach(notification => {
        const notificationElement = createAdminNotificationElement(notification);
        adminNotificationsList.appendChild(notificationElement);
    });
}

// دالة منفصلة لعرض نافذة إدارة الإشعارات
async function showAdminNotificationsModal() {
    await loadNotificationsFromDB();
    showModal('notificationFormModal');
    loadAdminNotifications();
}

function createAdminNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = 'admin-notification-item';

    div.innerHTML = `
        <div class="admin-notification-content">
            <div class="admin-notification-title">${notification.title}</div>
            <div class="admin-notification-type ${notification.type}">${notification.type}</div>
        </div>
        <div class="admin-notification-actions">
            <button class="edit-btn" onclick="editNotification(${notification.id})">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" onclick="deleteNotification(${notification.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return div;
}

function editNotification(id) {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
        // Fill the form with notification data
        document.getElementById('notificationTitle').value = notification.title;
        document.getElementById('notificationContent').value = notification.content;
        document.getElementById('notificationType').value = notification.type;

        // Update form to edit mode
        const form = document.getElementById('notificationForm');
        const submitButton = form.querySelector('button[type="submit"]');

        // Store the original handler and update form
        form.setAttribute('data-edit-id', id);
        submitButton.textContent = 'تحديث الإشعار';

        // Show the modal
        showModal('notificationFormModal');

        // Update form handler for edit mode
        form.onsubmit = async function(e) {
            e.preventDefault();
            await handleEditNotification(e, id);
        };
    }
}

async function handleEditNotification(e, id) {
    const title = document.getElementById('notificationTitle').value;
    const content = document.getElementById('notificationContent').value;
    const type = document.getElementById('notificationType').value;

    if (title && content && type) {
        // Update in local array
        const notificationIndex = notifications.findIndex(n => n.id === id);
        if (notificationIndex !== -1) {
            notifications[notificationIndex] = {
                ...notifications[notificationIndex],
                title,
                content,
                type
            };
        }

        showMessage('تم تحديث الإشعار بنجاح', 'success');

        // Reset form
        document.getElementById('notificationForm').reset();
        document.getElementById('notificationForm').removeAttribute('data-edit-id');
        document.getElementById('notificationForm').querySelector('button').textContent = 'إضافة الإشعار';
        document.getElementById('notificationForm').onsubmit = handleNewNotification;

        closeModal();
        loadAdminNotifications();
        loadNotifications();
    }
}

async function deleteNotification(id) {
    showConfirmDialog(
        'تأكيد الحذف',
        'هل أنت متأكد من حذف هذا الإشعار؟ لا يمكن التراجع عن هذا الإجراء.',
        async () => {
            try {
                // Try to delete from database if connected
                if (window.supabaseDb && window.supabaseDb.deleteNotification) {
                    await window.supabaseDb.deleteNotification(id);
                }

                // Remove from local array
                notifications = notifications.filter(n => n.id !== id);
                allNotifications = allNotifications.filter(n => n.id !== id);
                loadAdminNotifications();
                loadNotifications();
                showMessage('تم حذف الإشعار بنجاح', 'success');
            } catch (error) {
                console.error('Error deleting notification:', error);
                showMessage('حدث خطأ أثناء حذف الإشعار', 'error');
            }
        }
    );
}

// Show Old Notifications
async function showOldNotifications() {
    showModal('oldNotificationsModal');

    try {
        const dbNotifications = await window.supabaseDb.getNotifications();
        const oldNotifications = dbNotifications.map(notif => ({
            id: notif.id,
            title: notif.title,
            content: notif.content,
            type: notif.type,
            timestamp: new Date(notif.created_at)
        }));

        displayOldNotifications(oldNotifications);
    } catch (error) {
        console.error('Error loading old notifications:', error);
        showMessage('حدث خطأ في تحميل الإشعارات القديمة من قاعدة البيانات', 'error');
        displayOldNotifications([]);
    }
}

function displayOldNotifications(oldNotifications) {
    const oldNotificationsList = document.getElementById('oldNotificationsList');
    oldNotificationsList.innerHTML = '';

    if (oldNotifications.length === 0) {
        oldNotificationsList.innerHTML = '<div class="no-data">لا توجد إشعارات قديمة</div>';
        return;
    }

    oldNotifications.forEach((notification, index) => {
        const notificationElement = createOldNotificationElement(notification);
        notificationElement.classList.add('fade-in');
        notificationElement.style.animationDelay = `${index * 0.1}s`;
        oldNotificationsList.appendChild(notificationElement);
    });
}

function createOldNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = 'old-notification-item';

    const timeAgo = getTimeAgo(notification.timestamp);

    div.innerHTML = `
        <div class="old-notification-content">
            <div class="old-notification-header">
                <div class="old-notification-title">${notification.title}</div>
                <div class="old-notification-type ${notification.type}">${notification.type}</div>
            </div>
            <div class="old-notification-text">${notification.content}</div>
            <div class="old-notification-time">${timeAgo}</div>
        </div>
        <div class="old-notification-actions">
            <button class="edit-btn" onclick="editOldNotification(${notification.id})" title="تعديل">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" onclick="deleteOldNotification(${notification.id})" title="حذف">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return div;
}

function editOldNotification(id) {
    // Find notification in allNotifications array
    const notification = allNotifications.find(n => n.id === id);
    if (!notification) {
        showMessage('لم يتم العثور على الإشعار', 'error');
        return;
    }

    // Close old notifications modal
    closeModal();

    // Show notification form modal with data
    showModal('notificationFormModal');

    // Fill the form with notification data
    document.getElementById('notificationTitle').value = notification.title;
    document.getElementById('notificationContent').value = notification.content;
    document.getElementById('notificationType').value = notification.type;

    // Update form to edit mode
    const form = document.getElementById('notificationForm');
    const submitButton = form.querySelector('button[type="submit"]');

    // Store the original handler and update form
    form.setAttribute('data-edit-id', id);
    submitButton.textContent = 'تحديث الإشعار';

    // Update form handler for edit mode
    form.onsubmit = async function(e) {
        e.preventDefault();
        await handleEditOldNotification(e, id);
    };
}

async function handleEditOldNotification(e, id) {
    const title = document.getElementById('notificationTitle').value;
    const content = document.getElementById('notificationContent').value;
    const type = document.getElementById('notificationType').value;

    if (title && content && type) {
        showLoadingButton('#notificationForm button[type="submit"]');

        try {
            // Try to update in database if connected
            if (window.supabaseDb && window.supabaseDb.updateNotification) {
                await window.supabaseDb.updateNotification(id, title, content, type);
            }

            // Update in local arrays
            const notificationIndex = allNotifications.findIndex(n => n.id === id);
            if (notificationIndex !== -1) {
                allNotifications[notificationIndex] = {
                    ...allNotifications[notificationIndex],
                    title,
                    content,
                    type
                };
            }

            const currentNotificationIndex = notifications.findIndex(n => n.id === id);
            if (currentNotificationIndex !== -1) {
                notifications[currentNotificationIndex] = {
                    ...notifications[currentNotificationIndex],
                    title,
                    content,
                    type
                };
            }

            showMessage('تم تحديث الإشعار بنجاح', 'success');

            // Reset form
            document.getElementById('notificationForm').reset();
            document.getElementById('notificationForm').removeAttribute('data-edit-id');
            document.getElementById('notificationForm').querySelector('button').textContent = 'إضافة الإشعار';
            document.getElementById('notificationForm').onsubmit = handleNewNotification;

            closeModal();

            // Reload notifications
            await loadNotificationsFromDB();
        } catch (error) {
            console.error('Error updating notification:', error);
            showMessage('حدث خطأ أثناء تحديث الإشعار: ' + error.message, 'error');
        }

        hideLoadingButton('#notificationForm button[type="submit"]');
    } else {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
    }
}

async function deleteOldNotification(id) {
    showConfirmDialog(
        'تأكيد الحذف',
        'هل أنت متأكد من حذف هذا الإشعار؟ لا يمكن التراجع عن هذا الإجراء.',
        async () => {
            try {
                // Try to delete from database if connected
                if (window.supabaseDb && window.supabaseDb.deleteNotification) {
                    await window.supabaseDb.deleteNotification(id);
                }

                // Remove from local arrays
                allNotifications = allNotifications.filter(n => n.id !== id);
                notifications = notifications.filter(n => n.id !== id);

                showMessage('تم حذف الإشعار بنجاح', 'success');

                // Refresh the old notifications list
                showOldNotifications();

                // Reload current notifications
                await loadNotificationsFromDB();
            } catch (error) {
                console.error('Error deleting notification:', error);
                showMessage('حدث خطأ أثناء حذف الإشعار', 'error');
            }
        }
    );
}

async function showReportsPage() {
    try {
        let allReports = [];
        if (currentUser && currentUser.isAdmin) {
            allReports = await window.supabaseDb.getAllReports();
            showAdminReportsModal(allReports);
        } else {
            showMessage('ليس لديك صلاحية لعرض البلاغات', 'error');
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        showMessage('حدث خطأ في تحميل البلاغات من قاعدة البيانات', 'error');
    }
}

function showAdminReportsModal(reports) {
    // Create modal for admin reports
    const modalOverlay = document.getElementById('modalOverlay');

    // Remove existing admin reports modal if exists
    const existingModal = document.getElementById('adminReportsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create new modal
    const modal = document.createElement('div');
    modal.id = 'adminReportsModal';
    modal.className = 'modal';

    modal.innerHTML = `
        <div class="modal-header">
            <h3><i class="fas fa-clipboard-list"></i> إدارة البلاغات</h3>
            <span class="close-btn" onclick="closeModal()">&times;</span>
        </div>
        <div class="modal-content">
            <div id="adminReportsList" class="admin-reports-list">
                ${reports.map(report => createAdminReportElement(report)).join('')}
            </div>
        </div>
    `;

    modalOverlay.appendChild(modal);
    showModal('adminReportsModal');
}

function createAdminReportElement(report) {
    const statusText = {
        'pending': 'في الانتظار',
        'in-progress': 'جاري العمل عليها',
        'resolved': 'تم الحل'
    };

    const userName = report.users ? report.users.name : 'مستخدم غير معروف';
    const fileNumber = report.users ? report.users.file_number : 'غير محدد';

    return `
        <div class="admin-report-item">
            <div class="admin-report-header">
                <div class="admin-report-user">
                    <strong>${userName}</strong> (${fileNumber})
                </div>
                <div class="admin-report-status ${report.status}">
                    ${statusText[report.status]}
                </div>
            </div>
            <div class="admin-report-title">${report.title}</div>
            <div class="admin-report-content">${report.content}</div>
            <div class="admin-report-date">${formatDate(report.created_at || report.date.toISOString().split('T')[0])}</div>
            <div class="admin-report-actions">
                <button class="status-btn pending" onclick="updateReportStatus(${report.id}, 'pending')">
                    في الانتظار
                </button>
                <button class="status-btn in-progress" onclick="updateReportStatus(${report.id}, 'in-progress')">
                    جاري العمل
                </button>
                <button class="status-btn resolved" onclick="updateReportStatus(${report.id}, 'resolved')">
                    تم الحل
                </button>
            </div>
        </div>
    `;
}

async function updateReportStatus(reportId, status) {
    try {
        if (currentUser && currentUser.isAdmin) {
            console.log('Attempting to update report status:', { reportId, status });

            const result = await window.supabaseDb.updateReportStatus(reportId, status);

            if (result) {
                showMessage('تم تحديث حالة البلاغ بنجاح', 'success');
                showReportsPage(); // Refresh the reports list
            } else {
                showMessage('فشل في تحديث حالة البلاغ', 'error');
            }
        } else {
            showMessage('ليس لديك صلاحية لتحديث البلاغات', 'error');
        }
    } catch (error) {
        console.error('Error updating report status:', error);
        showMessage('حدث خطأ أثناء تحديث حالة البلاغ: ' + error.message, 'error');
    }
}

// Modal Functions
function showModal(modalId) {
    document.getElementById('modalOverlay').classList.add('active');
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.getElementById(modalId).classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });

    // Reset salary and expenses details
    document.getElementById('salaryDetails').style.display = 'none';
    document.getElementById('expensesDetails').style.display = 'none';
}

// Tab Functions
function showTab(tabId) {
    const modal = document.querySelector('.modal.active');
    if (modal) {
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        modal.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Activate the selected tab
        const tabBtn = modal.querySelector(`[onclick="showTab('${tabId}')"]`);
        const tabContent = modal.querySelector(`#${tabId}`);

        if (tabBtn && tabContent) {
            tabBtn.classList.add('active');
            tabContent.classList.add('active');
        }
    }
}

// Theme Functions
function toggleTheme() {
    if (isDarkMode) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
}

function enableDarkMode() {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.querySelector('.theme-toggle i').className = 'fas fa-sun';
    localStorage.setItem('theme', 'dark');
    isDarkMode = true;
}

function disableDarkMode() {
    document.documentElement.removeAttribute('data-theme');
    document.querySelector('.theme-toggle i').className = 'fas fa-moon';
    localStorage.setItem('theme', 'light');
    isDarkMode = false;
}

// Utility Functions
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

function showLoadingButton(selector) {
    const button = typeof selector === 'string' ?
        document.querySelector(selector) : selector;
    if (button) {
        button.classList.add('btn-loading');
        button.disabled = true;
    }
}

function hideLoadingButton(selector) {
    const button = typeof selector === 'string' ?
        document.querySelector(selector) : selector;
    if (button) {
        button.classList.remove('btn-loading');
        button.disabled = false;
    }
}

function showMessage(text, type = 'success') {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${text}
    `;

    // Insert at the top of the current page
    const currentPage = document.querySelector('.page.active');
    if (currentPage) {
        const content = currentPage.querySelector('.content') ||
            currentPage.querySelector('.modal-content') ||
            currentPage;
        content.insertBefore(message, content.firstChild);

        // Remove message after 3 seconds
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
}

function showConfirmDialog(title, message, onConfirm) {
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog-overlay';
    confirmDialog.innerHTML = `
        <div class="confirm-dialog">
            <div class="confirm-dialog-header">
                <h3><i class="fas fa-exclamation-triangle"></i> ${title}</h3>
            </div>
            <div class="confirm-dialog-content">
                <p>${message}</p>
            </div>
            <div class="confirm-dialog-actions">
                <button class="confirm-btn danger" onclick="handleConfirmAction(true)">تأكيد</button>
                <button class="confirm-btn cancel" onclick="handleConfirmAction(false)">إلغاء</button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmDialog);

    // Store the callback
    window.confirmCallback = onConfirm;

    // Add event listener for backdrop click
    confirmDialog.addEventListener('click', function(e) {
        if (e.target === this) {
            handleConfirmAction(false);
        }
    });
}

function handleConfirmAction(confirmed) {
    const dialog = document.querySelector('.confirm-dialog-overlay');
    if (dialog) {
        dialog.remove();
    }

    if (confirmed && window.confirmCallback) {
        window.confirmCallback();
    }

    // Clean up
    window.confirmCallback = null;
}

// Performance Reports Functions
async function showPerformanceData() {
    showModal('performanceModal');
    showSkeletonPerformanceData();

    try {
        if (currentUser && currentUser.fileNumber) {
            console.log('Loading performance data for user:', currentUser.fileNumber);
            const dbPerformanceData = await window.supabaseDb.getPerformanceReports(currentUser.fileNumber);

            performanceData = dbPerformanceData.map(report => ({
                month: report.month,
                year: report.year,
                efficiency_score: report.efficiency_score,
                punctuality_score: report.punctuality_score,
                productivity_score: report.productivity_score,
                teamwork_score: report.teamwork_score,
                customer_service_score: report.customer_service_score,
                overall_score: report.overall_score,
                strengths: report.strengths,
                areas_for_improvement: report.areas_for_improvement,
                goals_for_next_month: report.goals_for_next_month,
                supervisor_comments: report.supervisor_comments,
                employee_feedback: report.employee_feedback,
                performance_rating: report.performance_rating
            }));

            console.log('Processed performance data:', performanceData);
        }
    } catch (error) {
        console.error('Error loading performance data:', error);
    }

    // Wait a bit to show loading state
    setTimeout(() => {
        const monthsList = document.getElementById('performanceMonths');
        monthsList.innerHTML = '';

        if (performanceData.length === 0) {
            monthsList.innerHTML = '<div class="no-data">لا توجد بيانات تقارير أداء متاحة</div>';
        } else {
            performanceData.forEach((performance, index) => {
                const monthElement = document.createElement('div');
                monthElement.className = 'month-item slide-in';
                monthElement.style.animationDelay = `${index * 0.1}s`;
                monthElement.textContent = `${performance.month} ${performance.year}`;
                monthElement.onclick = () => showPerformanceDetails(performance);
                monthsList.appendChild(monthElement);
            });
        }
    }, 500);
}

function showSkeletonPerformanceData() {
    const monthsList = document.getElementById('performanceMonths');
    monthsList.innerHTML = '';

    for (let i = 0; i < 4; i++) {
        const skeletonElement = document.createElement('div');
        skeletonElement.className = 'skeleton skeleton-month';
        monthsList.appendChild(skeletonElement);
    }
}

function showPerformanceDetails(performance) {
    showPerformanceBreakdown(performance);
}

function showPerformanceBreakdown(performance) {
    closeModal();

    const modalOverlay = document.getElementById('modalOverlay');
    const modal = document.createElement('div');
    modal.id = 'performanceBreakdownModal';
    modal.className = 'modal';

    // Build performance breakdown
    const getRatingClass = (score) => {
        if (score >= 90) return 'excellent';
        if (score >= 80) return 'good';
        if (score >= 70) return 'average';
        return 'needs-improvement';
    };

    const getRatingText = (rating) => {
        const ratingMap = {
            'ممتاز': 'excellent',
            'جيد جداً': 'very-good',
            'جيد': 'good',
            'مقبول': 'average',
            'ضعيف': 'needs-improvement'
        };
        return ratingMap[rating] || 'average';
    };

    modal.innerHTML = `
        <div class="modal-header">
            <h3><i class="fas fa-chart-line"></i> تقرير الأداء - ${performance.month} ${performance.year}</h3>
            <span class="close-btn" onclick="closePerformanceBreakdown()">&times;</span>
        </div>
        <div class="modal-content">
            <div class="performance-breakdown">
                <div class="overall-rating ${getRatingText(performance.performance_rating)}">
                    <h4>التقييم العام: ${performance.performance_rating}</h4>
                    <div class="overall-score">${performance.overall_score}%</div>
                </div>
                
                <h4>تفاصيل الأداء:</h4>
                <div class="performance-scores">
                    <div class="score-item ${getRatingClass(performance.efficiency_score)}">
                        <span>الكفاءة:</span>
                        <span>${performance.efficiency_score}%</span>
                    </div>
                    <div class="score-item ${getRatingClass(performance.punctuality_score)}">
                        <span>الالتزام بالمواعيد:</span>
                        <span>${performance.punctuality_score}%</span>
                    </div>
                    <div class="score-item ${getRatingClass(performance.productivity_score)}">
                        <span>الإنتاجية:</span>
                        <span>${performance.productivity_score}%</span>
                    </div>
                    <div class="score-item ${getRatingClass(performance.teamwork_score)}">
                        <span>العمل الجماعي:</span>
                        <span>${performance.teamwork_score}%</span>
                    </div>
                    <div class="score-item ${getRatingClass(performance.customer_service_score)}">
                        <span>خدمة العملاء:</span>
                        <span>${performance.customer_service_score}%</span>
                    </div>
                </div>
                
                <div class="performance-feedback">
                    <div class="feedback-item">
                        <h5><i class="fas fa-thumbs-up"></i> نقاط القوة:</h5>
                        <p>${performance.strengths}</p>
                    </div>
                    
                    <div class="feedback-item">
                        <h5><i class="fas fa-arrow-up"></i> مجالات للتحسين:</h5>
                        <p>${performance.areas_for_improvement}</p>
                    </div>
                    
                    <div class="feedback-item">
                        <h5><i class="fas fa-target"></i> أهداف الشهر القادم:</h5>
                        <p>${performance.goals_for_next_month}</p>
                    </div>
                    
                    <div class="feedback-item">
                        <h5><i class="fas fa-comment"></i> تعليقات المشرف:</h5>
                        <p>${performance.supervisor_comments}</p>
                    </div>
                    
                    ${performance.employee_feedback ? `
                    <div class="feedback-item">
                        <h5><i class="fas fa-user-comment"></i> ملاحظات الموظف:</h5>
                        <p>${performance.employee_feedback}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    modalOverlay.appendChild(modal);
    showModal('performanceBreakdownModal');
}

function closePerformanceBreakdown() {
    const modal = document.getElementById('performanceBreakdownModal');
    if (modal) {
        modal.remove();
    }
    // Return to performance modal
    showModal('performanceModal');
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}