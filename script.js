let darkmode = localStorage.getItem('darkmode');
const themeSwitch = document.getElementById('theme-switch');

const enableDarkmode = () => {
  document.body.classList.add('darkmode');
  localStorage.setItem('darkmode', 'active');
};

const disableDarkmode = () => {
  document.body.classList.remove('darkmode');
  localStorage.setItem('darkmode', null);
};

if (darkmode === "active") enableDarkmode();

themeSwitch.addEventListener("click", () => {
  darkmode = localStorage.getItem('darkmode');
  darkmode !== "active" ? enableDarkmode() : disableDarkmode();
});

document.addEventListener('DOMContentLoaded', () => {
    let allRows = [];
    let currentPage = 1;
    let listingsPerPage = parseInt(document.getElementById('listings-per-page').value, 10) || 10;

    fetch('joblistings.csv')
        .then(response => response.text())
        .then(data => {
            allRows = csvToArray(data, ',', '"');
            const urlParams = new URLSearchParams(window.location.search);
            const searchTerm = urlParams.get('search') || '';
            const selectedType = urlParams.get('type') || ''; // Updated to 'type' to match query param

            document.getElementById('search-input').value = searchTerm;
            document.getElementById('job-type-filter').value = selectedType;

            filterAndDisplayListings(); // Display initial listings based on URL params
        })
        .catch(error => console.error('Error loading CSV:', error));

    document.getElementById('search-button').addEventListener('click', filterAndDisplayListings);
    document.getElementById('search-input').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') filterAndDisplayListings();
    });
    document.getElementById('job-type-filter').addEventListener('change', filterAndDisplayListings);
    document.getElementById('listings-per-page').addEventListener('change', () => {
        listingsPerPage = parseInt(document.getElementById('listings-per-page').value, 10);
        currentPage = 1;
        filterAndDisplayListings();
    });
    document.getElementById('sort-by').addEventListener('change', filterAndDisplayListings);

    function filterAndDisplayListings() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const selectedType = document.getElementById('job-type-filter').value;
        const sortBy = document.getElementById('sort-by').value;
    
        const filteredRows = allRows.filter(row => {
            const [company, title, location, description, type, date, link] = row;
            const matchesSearch = company.toLowerCase().includes(searchTerm) ||
                                  title.toLowerCase().includes(searchTerm) ||
                                  location.toLowerCase().includes(searchTerm) ||
                                  description.toLowerCase().includes(searchTerm);
            const matchesType = selectedType ? type === selectedType : true;
    
            return matchesSearch && matchesType;
        });

        // Sort filtered results
        if (sortBy === 'date-newest') {
            filteredRows.sort((a, b) => new Date(b[5]) - new Date(a[5]));
        } else if (sortBy === 'date-oldest') {
            filteredRows.sort((a, b) => new Date(a[5]) - new Date(b[5]));
        } else if (sortBy === 'title') {
            filteredRows.sort((a, b) => a[1].localeCompare(b[1]));
        }

        // Update browser history
        const state = {
            searchTerm: searchTerm,
            selectedType: selectedType,
            sortBy: sortBy
        };
        const title = 'Filtered Job Listings';
        const url = `?search=${encodeURIComponent(searchTerm)}&type=${encodeURIComponent(selectedType)}&sort=${encodeURIComponent(sortBy)}`;
        
        history.pushState(state, title, url);

        displayJobListings(filteredRows);
        setupPagination(filteredRows);
    }
    
    window.onpopstate = function(event) {
        if (event.state) {
            // Restore the search input and filter settings
            document.getElementById('search-input').value = event.state.searchTerm || '';
            document.getElementById('job-type-filter').value = event.state.selectedType || '';
            document.getElementById('sort-by').value = event.state.sortBy || 'date-newest';

            // Call the function to re-display listings
            filterAndDisplayListings();
        } else {
            // If no state, just display all listings
            displayJobListings(allRows);
            setupPagination(allRows);
        }
    };

    function displayJobListings(rows) {
        const jobListings = document.getElementById('job-listings');
        jobListings.innerHTML = '';
    
        const start = (currentPage - 1) * listingsPerPage;
        const end = start + listingsPerPage;
        const paginatedRows = rows.slice(start, end);
    
        paginatedRows.forEach(row => {
            const [company, title, location, description, type, date, link] = row;
            const formattedDate = formatDate(date);
    
            const jobItem = document.createElement('li');
            const jobCard = document.createElement('div');
            jobCard.classList.add('job-card');
    
            jobCard.innerHTML = `
                <div class="job-header">
                    <h2>${company}</h2>
                    <a href="${link}" class="apply-button">Apply</a>
                </div>
                <h3>${title}</h3>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Job Type:</strong> ${type}</p>
                <p><strong>Posted on:</strong> ${formattedDate}</p>
                <div class="job-content">
                    <div class="job-info">
                        <p><strong>Job Description:</strong></p>
                        <p>
                            <span class="truncated">${truncateDescription(description, 100)}</span>
                            <span class="full-description" style="display: none;">${description}</span>
                            <button class="read-more-btn">Read More</button>
                        </p>
                    </div>
                </div>
            `;
                    
            const readMoreBtn = jobCard.querySelector('.read-more-btn');
            readMoreBtn.addEventListener('click', () => toggleDescription(jobCard));
    
            jobItem.appendChild(jobCard);
            jobListings.appendChild(jobItem);
        });
    }
    
    function formatDate(dateString) {
        const [year, month, day] = dateString.split('-');
        return `${month}-${day}-${year}`;
    }
    
    function toggleDescription(jobCard) {
        const truncatedSpan = jobCard.querySelector('.truncated');
        const fullDescSpan = jobCard.querySelector('.full-description');
        const readMoreBtn = jobCard.querySelector('.read-more-btn');

        if (fullDescSpan.style.display === 'none') {
            fullDescSpan.style.display = 'inline';
            truncatedSpan.style.display = 'none';
            readMoreBtn.textContent = 'Read Less';
        } else {
            fullDescSpan.style.display = 'none';
            truncatedSpan.style.display = 'inline';
            readMoreBtn.textContent = 'Read More';
        }
    }

    function truncateDescription(description, limit) {
        return description.length > limit ? description.substring(0, limit) + '...' : description;
    }
    
    function setupPagination(rows) {
        const paginationContainer = document.getElementById('pagination-container');
        paginationContainer.innerHTML = '';

        const totalPages = Math.ceil(rows.length / listingsPerPage);
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.add('pagination-button');
            if (i === currentPage) {
                pageButton.classList.add('active');
            }

            pageButton.addEventListener('click', () => {
                currentPage = i;
                displayJobListings(rows);
                setupPagination(rows);
            });

            paginationContainer.appendChild(pageButton);
        }
    }
});

function csvToArray(strData, delimiter = ',', textSeparator = '"') {
    const pattern = new RegExp((textSeparator + "([^" + textSeparator + "]*)" + textSeparator +  
        "|([^" + delimiter + "]+)" +  
        "|(?<=,)"   
    ), "g");

    const lines = strData.split(/\r?\n/);
    const result = [];

    lines.forEach(line => {
        const row = [];
        let matches;

        while ((matches = pattern.exec(line)) !== null) {
            if (matches[1]) {
                row.push(matches[1].trim());
            } else if (matches[2]) {
                row.push(matches[2].trim());
            } else {
                row.push("");
            }
        }

        if (row.length > 0) {
            result.push(row);
        }
    });

    return result.slice(1);
}
