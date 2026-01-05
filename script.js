    // Initialize variables
    let categoryChart, lineChart;
    let transactions = [];
    let budget = {
      monthly: 0,
      categories: {}
    };
    let goals = [];
    let editingTransactionId = null;
    let categories = {
      income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other Income'],
      expense: ['Food & Dining', 'Shopping', 'Transportation', 'Entertainment', 'Bills & Utilities', 'Healthcare', 'Education', 'Investment', 'Other']
    };

    // DOM Content Loaded
    document.addEventListener('DOMContentLoaded', function() {
      initializeApp();
      loadData();
      setupEventListeners();
    });

    function initializeApp() {
      // Set current date
      const now = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      document.getElementById('dateDisplay').textContent = now.toLocaleDateString('en-US', options);
      document.getElementById('date').value = now.toISOString().split('T')[0];
      document.getElementById('goalDeadline').valueAsDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
      
      // Generate user ID
      let userId = localStorage.getItem('finflow_userId');
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('finflow_userId', userId);
      }
      document.getElementById('userIdDisplay').textContent = 'ID: ' + userId.substring(0, 12) + '...';
      
      // Initialize category options
      updateCategoryOptions();
      
      // Set greeting based on time
      setGreeting();
      
      // Initialize dark mode
      if (localStorage.getItem('finflow_darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.querySelector('.theme-toggle i').className = 'fas fa-sun';
      }
      
      // Check for first-time user
      if (!localStorage.getItem('finflow_firstVisit')) {
        setTimeout(() => {
          showToast('Welcome to FinFlow! Start by adding your first transaction.', 'success');
          localStorage.setItem('finflow_firstVisit', 'true');
        }, 1000);
      }
    }

    function setupEventListeners() {
      // Form submission
      const transactionForm = document.getElementById('transactionForm');
      if (transactionForm) {
        transactionForm.addEventListener('submit', function(e) {
          e.preventDefault();
          addTransaction(e);
        });
      }

      // Goal form submission
      const goalForm = document.getElementById('goalForm');
      if (goalForm) {
        goalForm.addEventListener('submit', function(e) {
          e.preventDefault();
          addGoal(e);
        });
      }

      // Budget form submission
    const budgetForm = document.getElementById('budgetForm');
    if (budgetForm) {
        budgetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveBudget(e);
        });
    }
      // Type change for category options
      const typeSelect = document.getElementById('type');
      if (typeSelect) {
        typeSelect.addEventListener('change', updateCategoryOptions);
      }

      // Chart period buttons
      document.querySelectorAll('.chart-action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const parent = this.parentElement;
          parent.querySelectorAll('.chart-action-btn').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          updateCharts();
        });
      });

      // Filter changes
      document.getElementById('categoryFilter')?.addEventListener('change', renderTransactions);
      document.getElementById('typeFilter')?.addEventListener('change', renderTransactions);
      document.getElementById('sortFilter')?.addEventListener('change', renderTransactions);

      // Modal close on outside click
      document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
          if (e.target === this) {
            this.style.display = 'none';
            if (this.id === 'addTransactionModal') {
              resetTransactionForm();
            }
          }
        });
      });

      // Close modals with Escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.style.display = 'none';
          });
          resetTransactionForm();
        }
      });
    }

    function setGreeting() {
      const hour = new Date().getHours();
      let greeting = 'Good ';
      if (hour < 12) greeting = 'Good Morning!';
      else if (hour < 18) greeting = 'Good Afternoon!';
      else greeting = 'Good Evening!';
      document.getElementById('greeting').textContent = greeting;
    }

    function loadData() {
      try {
        // Load transactions
        const storedTransactions = localStorage.getItem('finflow_transactions');
        transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
        
        // Load budget
    const storedBudget = localStorage.getItem('trackit_budget');
    budget = storedBudget ? JSON.parse(storedBudget) : { 
        monthly: 0, 
        categories: {} 
    };
        
        // Load goals
        const storedGoals = localStorage.getItem('finflow_goals');
        goals = storedGoals ? JSON.parse(storedGoals) : [];
        
        // Update UI
        updateDashboard();
        renderTransactions();
        updateCharts();
        updateBudgetDisplay();
      } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading saved data', 'error');
      }

       // Check if offline
    if (!navigator.onLine) {
        showToast('You are offline. Using cached data.', 'warning');
    }
    
    // Add offline event listeners
    window.addEventListener('offline', () => {
        showToast('You are offline. Changes will save locally.', 'warning');
    });
    
    window.addEventListener('online', () => {
        showToast('You are back online!', 'success');
    });
    }

    function saveData() {
      try {
        localStorage.setItem('finflow_transactions', JSON.stringify(transactions));
        localStorage.setItem('finflow_budget', JSON.stringify(budget));
        localStorage.setItem('finflow_goals', JSON.stringify(goals));
      } catch (error) {
        console.error('Error saving data:', error);
        showToast('Error saving data', 'error');
      }
    }

    function updateDashboard() {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      let totalIncome = 0;
      let totalExpense = 0;
      let monthlyIncome = 0;
      let monthlyExpense = 0;
      
      transactions.forEach(t => {
        const tDate = new Date(t.date);
        const isCurrentMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        
        if (t.type === 'income') {
          totalIncome += t.amount;
          if (isCurrentMonth) monthlyIncome += t.amount;
        } else {
          totalExpense += t.amount;
          if (isCurrentMonth) monthlyExpense += t.amount;
        }
      });
      
      const balance = totalIncome - totalExpense;
      const monthlyBalance = monthlyIncome - monthlyExpense;
      const monthlyTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      }).length;
      
      // Update DOM
      document.getElementById('totalBalance').textContent = formatCurrency(balance);
      document.getElementById('totalIncome').textContent = formatCurrency(monthlyIncome);
      document.getElementById('totalExpense').textContent = formatCurrency(monthlyExpense);
      document.getElementById('totalTransactions').textContent = monthlyTransactions;
      
      // Update change indicators
      const lastMonth = getLastMonthStats();
      const incomeChange = lastMonth.income > 0 ? ((monthlyIncome - lastMonth.income) / lastMonth.income * 100).toFixed(1) : 0;
      const expenseChange = lastMonth.expense > 0 ? ((monthlyExpense - lastMonth.expense) / lastMonth.expense * 100).toFixed(1) : 0;
      
      document.getElementById('incomeChange').innerHTML = incomeChange > 0 ? 
        `<i class="fas fa-arrow-up"></i> +${incomeChange}%` : 
        incomeChange < 0 ? `<i class="fas fa-arrow-down"></i> ${incomeChange}%` : '—';
      
      document.getElementById('expenseChange').innerHTML = expenseChange > 0 ? 
        `<i class="fas fa-arrow-up"></i> +${expenseChange}%` : 
        expenseChange < 0 ? `<i class="fas fa-arrow-down"></i> ${expenseChange}%` : '—';
      
      document.getElementById('balanceChange').innerHTML = monthlyBalance >= 0 ? 
        '<i class="fas fa-arrow-up positive"></i> Healthy' : 
        '<i class="fas fa-arrow-down negative"></i> Review spending';
    }

    function getLastMonthStats() {
      const now = new Date();
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      
      let income = 0;
      let expense = 0;
      
      transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (tDate.getMonth() === lastMonth && tDate.getFullYear() === year) {
          if (t.type === 'income') income += t.amount;
          else expense += t.amount;
        }
      });
      
      return { income, expense };
    }

    function updateBudgetDisplay() {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const monthlyExpense = transactions
        .filter(t => t.type === 'expense')
        .filter(t => {
          const tDate = new Date(t.date);
          return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      if (budget.monthly > 0) {
        const progress = Math.min((monthlyExpense / budget.monthly) * 100, 100);
        const remaining = Math.max(budget.monthly - monthlyExpense, 0);
        
        document.getElementById('budgetProgress').style.width = `${progress}%`;
        document.getElementById('budgetSpent').textContent = formatCurrency(monthlyExpense);
        document.getElementById('budgetRemaining').textContent = formatCurrency(remaining);
        document.getElementById('budgetTotal').textContent = formatCurrency(budget.monthly);
        
        // Update progress bar color based on usage
        const progressBar = document.getElementById('budgetProgress');
        if (progress < 70) {
          progressBar.style.background = 'linear-gradient(90deg, var(--success), var(--primary))';
        } else if (progress < 90) {
          progressBar.style.background = 'linear-gradient(90deg, var(--warning), #f9c74f)';
        } else {
          progressBar.style.background = 'linear-gradient(90deg, var(--danger), #f72585)';
        }
        
        document.getElementById('budgetSection').style.display = 'block';
      } else {
        document.getElementById('budgetSection').style.display = 'none';
      }
    }

    function addTransaction(e) {
      e.preventDefault();
      
      // Get form values
      const amount = parseFloat(document.getElementById('amount').value);
      const type = document.getElementById('type').value;
      const category = document.getElementById('category').value;
      const description = document.getElementById('description').value.trim();
      const date = document.getElementById('date').value;
      const paymentMethod = document.getElementById('paymentMethod').value;
      const notes = document.getElementById('notes').value.trim();
      const isRecurring = document.getElementById('isRecurring').checked;
      
      // Validation
      if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
      }
      
      if (!description) {
        showToast('Please enter a description', 'error');
        return;
      }
      
      const transaction = {
        id: editingTransactionId || Date.now() + Math.random(),
        amount: amount,
        type: type,
        category: category,
        description: description,
        date: date,
        paymentMethod: paymentMethod,
        notes: notes,
        isRecurring: isRecurring,
        createdAt: new Date().toISOString()
      };
      
      if (editingTransactionId) {
        // Update existing transaction
        const index = transactions.findIndex(t => t.id === editingTransactionId);
        if (index !== -1) {
          transactions[index] = transaction;
        }
        editingTransactionId = null;
        document.querySelector('#addTransactionModal h2').innerHTML = '<i class="fas fa-plus-circle"></i> Add Transaction';
      } else {
        // Add new transaction
        transactions.unshift(transaction);
      }
      
      saveData();
      updateDashboard();
      renderTransactions();
      updateCharts();
      closeModal('addTransactionModal');
      
      showToast(
        editingTransactionId ? 'Transaction updated!' : 'Transaction added!',
        'success'
      );
      
      // Reset form
      resetTransactionForm();
    }

    function resetTransactionForm() {
      document.getElementById('transactionForm').reset();
      document.getElementById('date').value = new Date().toISOString().split('T')[0];
      document.getElementById('type').value = 'expense';
      updateCategoryOptions();
      editingTransactionId = null;
      document.querySelector('#addTransactionModal h2').innerHTML = '<i class="fas fa-plus-circle"></i> Add Transaction';
    }

    function editTransaction(id) {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return;
      
      editingTransactionId = id;
      
      // Fill form with transaction data
      document.getElementById('amount').value = transaction.amount;
      document.getElementById('type').value = transaction.type;
      updateCategoryOptions();
      document.getElementById('category').value = transaction.category;
      document.getElementById('description').value = transaction.description;
      document.getElementById('date').value = transaction.date;
      document.getElementById('paymentMethod').value = transaction.paymentMethod || 'Cash';
      document.getElementById('notes').value = transaction.notes || '';
      document.getElementById('isRecurring').checked = transaction.isRecurring || false;
      
      // Update modal title
      document.querySelector('#addTransactionModal h2').innerHTML = '<i class="fas fa-edit"></i> Edit Transaction';
      
      showModal('addTransactionModal');
    }

    function deleteTransaction(id) {
      if (confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateDashboard();
        renderTransactions();
        updateCharts();
        showToast('Transaction deleted!', 'success');
      }
    }

    function updateCategoryOptions() {
      const type = document.getElementById('type')?.value;
      const categorySelect = document.getElementById('category');
      
      if (!type || !categorySelect) return;
      
      categorySelect.innerHTML = '';
      
      categories[type].forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      });
    }

    function renderTransactions() {
      const tableBody = document.getElementById('transactionsTable');
      const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
      const typeFilter = document.getElementById('typeFilter')?.value || 'all';
      const sortFilter = document.getElementById('sortFilter')?.value || 'date-desc';
      
      let filtered = [...transactions];
      
      // Apply filters
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(t => t.category === categoryFilter);
      }
      
      if (typeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilter);
      }
      
      // Apply sorting
      filtered.sort((a, b) => {
        switch (sortFilter) {
          case 'date-desc':
            return new Date(b.date) - new Date(a.date);
          case 'date-asc':
            return new Date(a.date) - new Date(b.date);
          case 'amount-desc':
            return b.amount - a.amount;
          case 'amount-asc':
            return a.amount - b.amount;
          default:
            return new Date(b.date) - new Date(a.date);
        }
      });
      
      // Get only recent transactions (first 10)
      const recent = filtered.slice(0, 10);
      
      if (recent.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center empty-state">
              <i class="fas fa-receipt"></i>
              <h3>No transactions found</h3>
              <p>${transactions.length === 0 ? 'Add your first transaction to get started' : 'Try changing your filters'}</p>
              <button class="action-btn" onclick="showAddTransactionModal()" style="margin-top: 20px;">
                <i class="fas fa-plus"></i> Add Transaction
              </button>
            </td>
          </tr>`;
        return;
      }
      
      let html = '';
      recent.forEach(t => {
        const date = new Date(t.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
        
        const icon = t.type === 'income' ? 
          '<i class="fas fa-arrow-down"></i>' : 
          '<i class="fas fa-arrow-up"></i>';
        
        const amountClass = t.type === 'income' ? 'positive' : 'negative';
        const sign = t.type === 'income' ? '+' : '-';
        
        html += `
          <tr>
            <td>
              <div class="transaction-item">
                <div class="transaction-icon ${t.type === 'expense' ? 'expense' : ''}">
                  ${icon}
                </div>
                <div class="transaction-details">
                  <h4>${t.description}</h4>
                  <p>${t.paymentMethod || 'Cash'} ${t.notes ? '• ' + t.notes : ''}</p>
                </div>
              </div>
            </td>
            <td>
              <span style="color: #64748b">
                <i class="fas fa-tag"></i> ${t.category}
                ${t.isRecurring ? '<i class="fas fa-redo ml-1" style="color: var(--primary); font-size: 12px;"></i>' : ''}
              </span>
            </td>
            <td class="transaction-date">${date}</td>
            <td class="transaction-amount ${amountClass}">
              ${sign}${formatCurrency(t.amount)}
            </td>
            <td>
              <div class="transaction-actions">
                <button class="action-icon edit" onclick="editTransaction(${t.id})">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="action-icon delete" onclick="deleteTransaction(${t.id})">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>`;
      });
      
      tableBody.innerHTML = html;
    }

    function updateCharts() {
      updateCategoryChart();
      updateLineChart();
    }

    function updateCategoryChart() {
      const ctx = document.getElementById('categoryChart')?.getContext('2d');
      if (!ctx) return;
      
      if (categoryChart) categoryChart.destroy();
      
      const period = document.querySelector('.chart-actions button.active[data-chart="category"]')?.dataset.period || 'month';
      const now = new Date();
      
      const categoryTotals = {};
      
      transactions.forEach(t => {
        if (t.type !== 'expense') return;
        
        const tDate = new Date(t.date);
        let include = false;
        
        switch (period) {
          case 'month':
            include = tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
            break;
          case 'year':
            include = tDate.getFullYear() === now.getFullYear();
            break;
          case 'all':
            include = true;
            break;
        }
        
        if (include) {
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        }
      });
      
      const labels = Object.keys(categoryTotals);
      const data = Object.values(categoryTotals);
      
      if (labels.length === 0) {
        ctx.canvas.parentNode.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-chart-pie"></i>
            <h3>No expense data</h3>
            <p>Add expenses to see breakdown</p>
          </div>`;
        return;
      }
      
      // Color palette
      const colors = [
        '#4361ee', '#3a0ca3', '#7209b7', '#f72585', 
        '#4cc9f0', '#f8961e', '#2a9d8f', '#e9c46a',
        '#e76f51', '#264653'
      ];
      
      categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: 'white'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'right',
              labels: {
                padding: 20,
                usePointStyle: true
              }
            }
          }
        }
      });
    }

    function updateLineChart() {
      const ctx = document.getElementById('lineChart')?.getContext('2d');
      if (!ctx) return;
      
      if (lineChart) lineChart.destroy();
      
      const period = document.querySelector('.chart-actions button.active[data-chart="line"]')?.dataset.period || '6months';
      const now = new Date();
      
      let months = 6; // Default
      if (period === 'year') months = 12;
      if (period === 'all') {
        months = Math.max(12, Math.ceil(transactions.length / 30)); // Dynamic based on data
      }
      
      const labels = [];
      const incomeData = new Array(months).fill(0);
      const expenseData = new Array(months).fill(0);
      
      // Generate labels
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
      }
      
      // Aggregate data
      transactions.forEach(t => {
        const tDate = new Date(t.date);
        const diffMonths = (now.getFullYear() - tDate.getFullYear()) * 12 + now.getMonth() - tDate.getMonth();
        
        if (diffMonths < months && diffMonths >= 0) {
          const index = months - 1 - diffMonths;
          if (t.type === 'income') {
            incomeData[index] += t.amount;
          } else {
            expenseData[index] += t.amount;
          }
        }
      });
      
      lineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Income',
              data: incomeData,
              borderColor: '#4cc9f0',
              backgroundColor: 'rgba(76, 201, 240, 0.1)',
              tension: 0.4,
              fill: true,
              borderWidth: 3
            },
            {
              label: 'Expense',
              data: expenseData,
              borderColor: '#f72585',
              backgroundColor: 'rgba(247, 37, 133, 0.1)',
              tension: 0.4,
              fill: true,
              borderWidth: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '₹' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }

    // Navigation functions
    function showDashboard() {
      updateActiveNav('dashboard');
      closeAllModals();
    }
    
    function showAllTransactions() {
      updateActiveNav('transactions');
      loadAllTransactions();
      showModal('allTransactionsModal');
    }
    
    function showReports() {
      updateActiveNav('reports');
      showModal('reportsModal');
    }
    
    function showGoals() {
      updateActiveNav('goals');
      loadGoals();
      showModal('goalsModal');
    }
    
    function showSettings() {
      updateActiveNav('settings');
      loadSettings();
      showModal('settingsModal');
    }
    
    function updateActiveNav(current) {
      const navItems = document.querySelectorAll('.sidebar-menu a');
      navItems.forEach(item => item.classList.remove('active'));
      
      const navMap = {
        'dashboard': 0,
        'transactions': 1,
        'budget': 2,
'reports': 3,
        'goals': 4,
        'settings': 5
      };
      
      if (navMap[current] !== undefined) {
        navItems[navMap[current]].classList.add('active');
      }
    }
    
    function closeAllModals() {
      document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.style.display = 'none';
      });
    }
    
    // All Transactions functions
    function loadAllTransactions() {
      const tableBody = document.getElementById('allTransactionsTable');
      const monthFilter = document.getElementById('transactionMonthFilter');
      
      let filtered = [...transactions];
      
      if (monthFilter.value) {
        const [year, month] = monthFilter.value.split('-');
        filtered = filtered.filter(t => {
          const tDate = new Date(t.date);
          return tDate.getFullYear() == year && (tDate.getMonth() + 1) == month;
        });
      }
      
      // Sort by date descending
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      if (filtered.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center empty-state">
              <i class="fas fa-receipt"></i>
              <h3>No transactions</h3>
              <p>No transactions found for selected period</p>
            </td>
          </tr>`;
        document.getElementById('allTransactionsCount').textContent = '0 transactions';
        return;
      }
      
      let html = '';
      filtered.forEach(t => {
        const date = new Date(t.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
        
        const amountClass = t.type === 'income' ? 'positive' : 'negative';
        const sign = t.type === 'income' ? '+' : '-';
        const typeBadge = t.type === 'income' ? 
          '<span style="background: #10b98120; color: #10b981; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Income</span>' :
          '<span style="background: #ef444420; color: #ef4444; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Expense</span>';
        
        html += `
          <tr>
            <td class="transaction-date">${date}</td>
            <td>
              <div class="transaction-details">
                <h4 style="margin: 0;">${t.description}</h4>
                <p style="font-size: 12px; color: var(--gray); margin: 4px 0 0 0;">${t.notes || ''}</p>
              </div>
            </td>
            <td><i class="fas fa-tag"></i> ${t.category}</td>
            <td>${typeBadge}</td>
            <td class="transaction-amount ${amountClass}">${sign}${formatCurrency(t.amount)}</td>
            <td>
              <div class="transaction-actions">
                <button class="action-icon edit" onclick="editTransaction(${t.id})">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="action-icon delete" onclick="deleteTransaction(${t.id})">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>`;
      });
      
      tableBody.innerHTML = html;
      document.getElementById('allTransactionsCount').textContent = `${filtered.length} transactions`;
    }
    
    function filterAllTransactions() {
      loadAllTransactions();
    }
    
    function exportTransactionsCSV() {
      const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Notes'];
      const csvData = transactions.map(t => [
        new Date(t.date).toLocaleDateString('en-US'),
        `"${t.description.replace(/"/g, '""')}"`,
        t.category,
        t.type,
        t.amount,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ]);
      
      const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast('Transactions exported as CSV', 'success');
    }
    
    // Reports functions
    function generateMonthlyReport() {
      const months = {};
      const now = new Date();
      
      // Group by month
      transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        if (!months[monthKey]) {
          months[monthKey] = {
            name: monthName,
            income: 0,
            expense: 0
          };
        }
        
        if (t.type === 'income') {
          months[monthKey].income += t.amount;
        } else {
          months[monthKey].expense += t.amount;
        }
      });
      
      const sortedMonths = Object.values(months).sort((a, b) => {
        return new Date(b.name) - new Date(a.name);
      });
      
      let html = `
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; color: var(--dark);">Monthly Financial Summary</h4>
          <p style="color: var(--gray); margin: 0;">Last updated: ${new Date().toLocaleDateString()}</p>
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Expenses</th>
              <th>Balance</th>
              <th>Savings Rate</th>
            </tr>
          </thead>
          <tbody>`;
      
      sortedMonths.forEach(month => {
        const balance = month.income - month.expense;
        const savingsRate = month.income > 0 ? ((balance / month.income) * 100).toFixed(1) + '%' : '0%';
        
        html += `
          <tr>
            <td>${month.name}</td>
            <td style="color: #10b981; font-weight: 600;">${formatCurrency(month.income)}</td>
            <td style="color: #ef4444; font-weight: 600;">${formatCurrency(month.expense)}</td>
            <td style="color: ${balance >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">${formatCurrency(balance)}</td>
            <td style="font-weight: 600; color: ${balance >= 0 ? '#10b981' : '#ef4444'}">${savingsRate}</td>
          </tr>`;
      });
      
      html += `</tbody></table>`;
      
      document.getElementById('reportTitle').textContent = 'Monthly Financial Report';
      document.getElementById('reportData').innerHTML = html;
      document.getElementById('reportContent').style.display = 'block';
    }
    
    function generateCategoryReport() {
      const categoryTotals = {};
      
      transactions.forEach(t => {
        if (t.type === 'expense') {
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        }
      });
      
      const sortedCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10); // Top 10 categories
      
      let html = `
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; color: var(--dark);">Top Spending Categories</h4>
          <p style="color: var(--gray); margin: 0;">Based on all-time expense data</p>
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Total Spent</th>
              <th>Percentage</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>`;
      
      const totalExpense = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
      
      sortedCategories.forEach(([category, amount]) => {
        const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;
        const barWidth = Math.min((amount / totalExpense) * 100, 100);
        
        html += `
          <tr>
            <td><i class="fas fa-tag"></i> ${category}</td>
            <td style="color: #ef4444; font-weight: 600;">${formatCurrency(amount)}</td>
            <td>${percentage}%</td>
            <td>
              <div style="width: 100px; height: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 4px; overflow: hidden;">
                <div style="width: ${barWidth}%; height: 100%; background: linear-gradient(90deg, #ef4444, #f87171); border-radius: 4px;"></div>
              </div>
            </td>
          </tr>`;
      });
      
      html += `</tbody></table>`;
      
      document.getElementById('reportTitle').textContent = 'Category Spending Report';
      document.getElementById('reportData').innerHTML = html;
      document.getElementById('reportContent').style.display = 'block';
    }
    
    function generateIncomeExpenseReport() {
      const monthlyData = {};
      const now = new Date();
      const last6Months = [];
      
      // Generate last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        
        last6Months.push({ key: monthKey, name: monthName });
        monthlyData[monthKey] = { income: 0, expense: 0 };
      }
      
      // Fill data
      transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyData[monthKey]) {
          if (t.type === 'income') {
            monthlyData[monthKey].income += t.amount;
          } else {
            monthlyData[monthKey].expense += t.amount;
          }
        }
      });
      
      let html = `
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; color: var(--dark);">Income vs Expense - Last 6 Months</h4>
          <p style="color: var(--gray); margin: 0;">Comparative analysis of cash flow</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #10b98120, #10b98110); padding: 20px; border-radius: var(--radius); border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 10px 0; color: #10b981;">Total Income</h3>
            <div style="font-size: 32px; font-weight: 700; color: #10b981;">${formatCurrency(last6Months.reduce((sum, month) => sum + monthlyData[month.key].income, 0))}</div>
          </div>
          <div style="background: linear-gradient(135deg, #ef444420, #ef444410); padding: 20px; border-radius: var(--radius); border-left: 4px solid #ef4444;">
            <h3 style="margin: 0 0 10px 0; color: #ef4444;">Total Expense</h3>
            <div style="font-size: 32px; font-weight: 700; color: #ef4444;">${formatCurrency(last6Months.reduce((sum, month) => sum + monthlyData[month.key].expense, 0))}</div>
          </div>
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Expense</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>`;
      
      last6Months.forEach(month => {
        const data = monthlyData[month.key];
        const balance = data.income - data.expense;
        const status = balance >= 0 ? 
          '<span style="color: #10b981; background: #10b98120; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Positive</span>' :
          '<span style="color: #ef4444; background: #ef444420; padding: 4px 8px; border-radius: 12px; font-size: 12px;">Negative</span>';
        
        html += `
          <tr>
            <td>${month.name}</td>
            <td style="color: #10b981; font-weight: 600;">${formatCurrency(data.income)}</td>
            <td style="color: #ef4444; font-weight: 600;">${formatCurrency(data.expense)}</td>
            <td style="color: ${balance >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">${formatCurrency(balance)}</td>
            <td>${status}</td>
          </tr>`;
      });
      
      html += `</tbody></table>`;
      
      document.getElementById('reportTitle').textContent = 'Income vs Expense Report';
      document.getElementById('reportData').innerHTML = html;
      document.getElementById('reportContent').style.display = 'block';
    }
    
    function printReport() {
      window.print();
    }
    
    // Goals functions
    function loadGoals() {
      const container = document.getElementById('goalsList');
      
      if (goals.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="text-align: center; padding: 40px 20px;">
            <i class="fas fa-bullseye" style="font-size: 48px; color: #e2e8f0; margin-bottom: 15px;"></i>
            <h3 style="color: var(--gray); margin-bottom: 10px;">No goals yet</h3>
            <p style="color: #94a3b8; margin-bottom: 20px;">Set your first financial goal to track progress</p>
          </div>`;
        return;
      }
      
      let html = '';
      goals.forEach((goal, index) => {
        const progress = goal.currentAmount / goal.targetAmount * 100;
        const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        const status = daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft} days left`;
        
        html += `
          <div class="goal-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <div>
                <h4 style="margin: 0 0 5px 0; color: var(--dark);">${goal.title}</h4>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 12px; color: var(--gray);">
                    <i class="fas fa-tag"></i> ${goal.category}
                  </span>
                  <span style="font-size: 12px; color: ${daysLeft < 0 ? '#ef4444' : daysLeft < 7 ? '#f59e0b' : '#10b981'}">
                    <i class="fas fa-calendar"></i> ${status}
                  </span>
                </div>
              </div>
              <div class="goal-actions">
                <button class="action-icon edit" onclick="editGoal(${index})">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="action-icon delete" onclick="deleteGoal(${index})">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            
            <div class="goal-info">
              <span>${formatCurrency(goal.currentAmount)} saved</span>
              <span>${formatCurrency(goal.targetAmount)} target</span>
            </div>
            
            <div class="goal-progress">
              <div class="goal-progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
              <span style="font-size: 14px; color: var(--gray);">
                ${progress.toFixed(1)}% complete
              </span>
              <span style="font-size: 14px; font-weight: 600; color: ${progress >= 100 ? '#10b981' : 'var(--primary)'}">
                ${formatCurrency(goal.targetAmount - goal.currentAmount)} to go
              </span>
            </div>
            
            ${goal.notes ? `<p style="margin-top: 10px; font-size: 14px; color: var(--gray);">${goal.notes}</p>` : ''}
          </div>`;
      });
      
      container.innerHTML = html;
    }
    
    function showAddGoalModal() {
      document.getElementById('goalDeadline').valueAsDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
      showModal('addGoalModal');
    }
    
    function addGoal(e) {
      e.preventDefault();
      
      const goal = {
        id: Date.now(),
        title: document.getElementById('goalTitle').value,
        targetAmount: parseFloat(document.getElementById('goalAmount').value),
        currentAmount: parseFloat(document.getElementById('goalCurrent').value) || 0,
        deadline: document.getElementById('goalDeadline').value,
        category: document.getElementById('goalCategory').value,
        notes: document.getElementById('goalNotes').value,
        createdAt: new Date().toISOString()
      };
      
      goals.push(goal);
      saveData();
      loadGoals();
      closeModal('addGoalModal');
      showToast('Goal added successfully!', 'success');
      document.getElementById('goalForm').reset();
    }
    
    function editGoal(index) {
      const goal = goals[index];
      if (!goal) return;
      
      document.getElementById('goalTitle').value = goal.title;
      document.getElementById('goalAmount').value = goal.targetAmount;
      document.getElementById('goalCurrent').value = goal.currentAmount;
      document.getElementById('goalDeadline').value = goal.deadline;
      document.getElementById('goalCategory').value = goal.category;
      document.getElementById('goalNotes').value = goal.notes || '';
      
      // Store the index for updating
      document.getElementById('goalForm').dataset.editIndex = index;
      
      showModal('addGoalModal');
    }
    
    function deleteGoal(index) {
      if (confirm('Are you sure you want to delete this goal?')) {
        goals.splice(index, 1);
        saveData();
        loadGoals();
        showToast('Goal deleted!', 'success');
      }
    }
    
    // Budget functions
    function setBudget() {
      showModal('budgetModal');
      populateCategoryBudgets();
    }
    
    function saveBudget(e) {
      e.preventDefault();
      const monthlyBudget = parseFloat(document.getElementById('monthlyBudget').value) || 0;
      budget.monthly = monthlyBudget;
      
      // Save category budgets
      const categoryInputs = document.querySelectorAll('[data-category-budget]');
      categoryInputs.forEach(input => {
        const category = input.getAttribute('data-category-budget');
        const value = parseFloat(input.value) || 0;
        budget.categories[category] = value;
      });
      
      saveData();
      closeModal('budgetModal');
      updateBudgetDisplay();
      showToast('Budget saved successfully!', 'success');
    }
    
    function addCategoryBudget() {
      const container = document.getElementById('categoryBudgets');
      const select = document.createElement('select');
      const input = document.createElement('input');
      const div = document.createElement('div');
      
      select.innerHTML = `
        <option value="">Select Category</option>
        ${categories.expense.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      `;
      
      input.type = 'number';
      input.placeholder = 'Budget amount';
      input.step = '0.01';
      input.min = '0';
      
      div.style.display = 'grid';
      div.style.gridTemplateColumns = '1fr 1fr';
      div.style.gap = '10px';
      div.style.marginBottom = '10px';
      
      div.appendChild(select);
      div.appendChild(input);
      container.appendChild(div);
    }
    
    function populateCategoryBudgets() {
      const container = document.getElementById('categoryBudgets');
      container.innerHTML = '';
      
      document.getElementById('monthlyBudget').value = budget.monthly || '';
      
      Object.entries(budget.categories).forEach(([category, amount]) => {
        const div = document.createElement('div');
        div.style.display = 'grid';
        div.style.gridTemplateColumns = '1fr 1fr';
        div.style.gap = '10px';
        div.style.marginBottom = '10px';
        
        const select = document.createElement('select');
        select.innerHTML = `
          <option value="">Select Category</option>
          ${categories.expense.map(cat => `<option value="${cat}" ${cat === category ? 'selected' : ''}>${cat}</option>`).join('')}
        `;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = amount;
        input.step = '0.01';
        input.min = '0';
        input.setAttribute('data-category-budget', category);
        
        div.appendChild(select);
        div.appendChild(input);
        container.appendChild(div);
      });
    }
    
    // Settings functions
    function loadSettings() {
      const settings = JSON.parse(localStorage.getItem('finflow_settings') || '{}');
      
      if (settings.currency) {
        document.getElementById('currencySetting').value = settings.currency;
      }
      
      if (settings.dateFormat) {
        document.getElementById('dateFormatSetting').value = settings.dateFormat;
      }
      
      if (settings.defaultType) {
        document.getElementById('defaultTypeSetting').value = settings.defaultType;
      }
      
      // Update stats in settings
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const totalBalance = totalIncome - totalExpense;
      
      document.getElementById('settingsTransactionCount').textContent = transactions.length;
      document.getElementById('settingsBalance').textContent = formatCurrency(totalBalance);
    }
    
    function saveSettings() {
      const settings = {
        currency: document.getElementById('currencySetting').value,
        dateFormat: document.getElementById('dateFormatSetting').value,
        defaultType: document.getElementById('defaultTypeSetting').value
      };
      
      localStorage.setItem('finflow_settings', JSON.stringify(settings));
      closeModal('settingsModal');
      showToast('Settings saved successfully!', 'success');
    }
    
    function importData() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('This will replace all your current data. Continue?')) {
              if (data.transactions) {
                transactions = data.transactions;
                localStorage.setItem('finflow_transactions', JSON.stringify(transactions));
              }
              
              if (data.budget) {
                budget = data.budget;
                localStorage.setItem('finflow_budget', JSON.stringify(budget));
              }
              
              if (data.goals) {
                goals = data.goals;
                localStorage.setItem('finflow_goals', JSON.stringify(goals));
              }
              
              loadData();
              loadGoals();
              showToast('Data imported successfully!', 'success');
            }
          } catch (error) {
            showToast('Error importing data. Invalid file format.', 'error');
          }
        };
        
        reader.readAsText(file);
      };
      
      input.click();
    }
    
    function resetData() {
      if (confirm('Are you absolutely sure? This will delete ALL your transactions, budgets, and goals. This action cannot be undone.')) {
        localStorage.clear();
        transactions = [];
        budget = { monthly: 0, categories: {} };
        goals = [];
        
        // Reset UI
        updateDashboard();
        renderTransactions();
        loadGoals();
        updateCharts();
        
        closeModal('settingsModal');
        showToast('All data has been reset', 'success');
      }
    }
    
    // Quick add income
    function quickAddIncome() {
      document.getElementById('type').value = 'income';
      updateCategoryOptions();
      document.getElementById('category').value = 'Salary';
      document.getElementById('description').value = 'Quick Income';
      document.getElementById('amount').focus();
      showAddTransactionModal();
    }
    
    // Export data
    function exportData() {
      const data = {
        user: localStorage.getItem('finflow_userId'),
        exportedAt: new Date().toISOString(),
        transactions: transactions,
        budget: budget,
        goals: goals,
        summary: {
          totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
          totalExpense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
          totalBalance: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) - 
                       transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
        }
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finflow-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Data exported successfully!', 'success');
    }
    
    // Modal functions
    function showAddTransactionModal() {
      showModal('addTransactionModal');
    }
    
    function showModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'flex';
      }
    }
    
    function closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'none';
      }
      
      if (modalId === 'addTransactionModal') {
        resetTransactionForm();
      }
    }
    
    // Utility functions
    function formatCurrency(amount) {
      return '₹' + Math.abs(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      const icon = toast.querySelector('i');
      const title = document.getElementById('toastTitle');
      const messageEl = document.getElementById('toastMessage');
      
      // Set content
      title.textContent = type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Warning!';
      messageEl.textContent = message;
      
      // Set icon and color
      if (type === 'success') {
        icon.className = 'fas fa-check-circle';
        toast.className = 'toast show';
      } else if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle';
        toast.className = 'toast error show';
      } else if (type === 'warning') {
        icon.className = 'fas fa-exclamation-triangle';
        toast.className = 'toast warning show';
      }
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
    
    // Other functions
    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const toggle = document.querySelector('.menu-toggle');
      sidebar.classList.toggle('active');
      toggle.classList.toggle('active');
    }
    
    function toggleTheme() {
      const body = document.body;
      const themeToggle = document.querySelector('.theme-toggle i');
      
      if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        themeToggle.className = 'fas fa-moon';
        localStorage.setItem('finflow_darkMode', 'false');
      } else {
        body.classList.add('dark-mode');
        themeToggle.className = 'fas fa-sun';
        localStorage.setItem('finflow_darkMode', 'true');
      }
    }
    // Budget functions
function setBudget() {
    updateActiveNav('budget');
    showModal('budgetModal');
    populateCategoryBudgets();
}

function showBudgetModal() {
    setBudget();
}

function saveBudget(e) {
    e.preventDefault();
    const monthlyBudget = parseFloat(document.getElementById('monthlyBudget').value) || 0;
    budget.monthly = monthlyBudget;
    
    // Save category budgets
    const categoryInputs = document.querySelectorAll('#categoryBudgets select');
    categoryInputs.forEach((select, index) => {
        const input = document.querySelectorAll('#categoryBudgets input')[index];
        if (select.value && input.value) {
            budget.categories[select.value] = parseFloat(input.value) || 0;
        }
    });
    
    saveData();
    closeModal('budgetModal');
    updateBudgetDisplay();
    showToast('Budget saved successfully!', 'success');
}

function populateCategoryBudgets() {
    const container = document.getElementById('categoryBudgets');
    container.innerHTML = '';
    
    document.getElementById('monthlyBudget').value = budget.monthly || '';
    
    // Add existing category budgets
    Object.entries(budget.categories).forEach(([category, amount]) => {
        addBudgetCategoryRow(category, amount);
    });
    
    // Add one empty row by default
    if (Object.keys(budget.categories).length === 0) {
        addBudgetCategoryRow('', '');
    }
}

function addBudgetCategoryRow(category = '', amount = '') {
    const container = document.getElementById('categoryBudgets');
    const div = document.createElement('div');
    div.className = 'budget-category-row';
    div.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    const select = document.createElement('select');
    select.innerHTML = `
        <option value="">Select Category</option>
        ${categories.expense.map(cat => `<option value="${cat}" ${cat === category ? 'selected' : ''}>${cat}</option>`).join('')}
    `;
    select.style.padding = '8px 12px';
    select.style.borderRadius = '8px';
    select.style.border = '1px solid var(--border)';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.value = amount;
    input.placeholder = 'Budget amount';
    input.step = '0.01';
    input.min = '0';
    input.style.padding = '8px 12px';
    input.style.borderRadius = '8px';
    input.style.border = '1px solid var(--border)';
    
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.style.cssText = 'background: var(--danger); color: white; border: none; width: 36px; height: 36px; border-radius: 8px; cursor: pointer;';
    removeBtn.onclick = function() {
        container.removeChild(div);
    };
    
    div.appendChild(select);
    div.appendChild(input);
    div.appendChild(removeBtn);
    container.appendChild(div);
}

function addCategoryBudget() {
    addBudgetCategoryRow();

}

 const manifest = {
      "name": "FinFlow",
      "short_name": "FinFlow",
      "description": "Personal Expense Tracker",
      "start_url": ".",
      "display": "standalone",
      "background_color": "#4361ee",
      "theme_color": "#4361ee",
      "orientation": "portrait",
      "icons": [{
        "src": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        "sizes": "192x192",
        "type": "image/png"
      }]
    };
    
    const manifestBlob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(manifestBlob);
    document.getElementById('manifest').href = manifestURL;
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      const swCode = `
        const CACHE_NAME = 'finflow-v1';
        
        self.addEventListener('install', event => {
          console.log('Service Worker installing');
        });
        
        self.addEventListener('fetch', event => {
          event.respondWith(
            fetch(event.request).catch(() => {
              return new Response('You are offline');
            })
          );
        });
      `;
      
      const swBlob = new Blob([swCode], {type: 'application/javascript'});
      const swURL = URL.createObjectURL(swBlob);
      
      navigator.serviceWorker.register(swURL)
        .then(reg => console.log('SW registered'))
        .catch(err => console.log('SW registration failed:', err));
    }
    
    // Detect if app is launched from home screen
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('Running as installed app');
    }
    
    // Make functions available globally
    window.showDashboard = showDashboard;
    window.showAllTransactions = showAllTransactions;
    window.showReports = showReports;
    window.showGoals = showGoals;
    window.showSettings = showSettings;
    window.showAddGoalModal = showAddGoalModal;
    window.showAddTransactionModal = showAddTransactionModal;
    window.filterAllTransactions = filterAllTransactions;
    window.exportTransactionsCSV = exportTransactionsCSV;
    window.generateMonthlyReport = generateMonthlyReport;
    window.generateCategoryReport = generateCategoryReport;
    window.generateIncomeExpenseReport = generateIncomeExpenseReport;
    window.printReport = printReport;
    window.addGoal = addGoal;
    window.editGoal = editGoal;
    window.deleteGoal = deleteGoal;
    window.saveSettings = saveSettings;
    window.importData = importData;
    window.resetData = resetData;
    window.toggleSidebar = toggleSidebar;
    window.toggleTheme = toggleTheme;
    window.quickAddIncome = quickAddIncome;
    window.exportData = exportData;
    window.editTransaction = editTransaction;
    window.deleteTransaction = deleteTransaction;
    window.closeModal = closeModal;
    window.setBudget = setBudget;
    window.showBudgetModal = showBudgetModal;
    window.saveBudget = saveBudget;
    window.addCategoryBudget = addCategoryBudget;
