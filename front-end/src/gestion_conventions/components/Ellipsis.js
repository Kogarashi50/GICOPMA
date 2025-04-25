// Helper function for pagination numbers (Revised for Fixed Slots)
// Place outside DynamicTable component
const getPageNumbers = (currentPageZeroBased, totalPages) => {
    const currentPage = currentPageZeroBased + 1; // 1-based index for display
    const pagesToShow = 5; // Total slots: First + Prev + Current + Next + Last (adjust as needed)
    const pageNumbers = [];

    // Always show First page
    pageNumbers.push(1);

    // Conditions for Ellipsis and Middle Numbers
    if (totalPages <= pagesToShow) {
        // Show all pages if total is small
        for (let i = 2; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
    } else {
        // Ellipsis logic
        const showLeftEllipsis = currentPage > 3; // Show ... after page 1 if current is 4 or more
        const showRightEllipsis = currentPage < totalPages - 2; // Show ... before last page if current is less than N-2

        if (showLeftEllipsis) {
            pageNumbers.push('...');
        }

        // Determine middle pages to show
        let startPage, endPage;
        if (!showLeftEllipsis && showRightEllipsis) { // Near start
            startPage = 2;
            endPage = pagesToShow -1; // Show 1, 2, 3, 4, ..., N
        } else if (showLeftEllipsis && !showRightEllipsis) { // Near end
            startPage = totalPages - (pagesToShow -2); // Show 1, ..., N-3, N-2, N-1, N
             endPage = totalPages -1;
        } else if (showLeftEllipsis && showRightEllipsis) { // In the middle
            startPage = currentPage - 1; // Show 1, ..., C-1, C, C+1, ..., N
            endPage = currentPage + 1;
        } else { // Very few pages (handled by first if, but fallback)
             startPage = 2;
             endPage = totalPages -1;
        }


        for (let i = startPage; i <= endPage; i++) {
            // Avoid duplicating first/last or ellipsis placeholders
            if (i > 1 && i < totalPages && !pageNumbers.includes(i)) {
                pageNumbers.push(i);
            }
        }

        if (showRightEllipsis) {
             // Ensure no duplicate ellipsis if endPage was already N-1
             if(pageNumbers[pageNumbers.length-1] !== '...'){
                 pageNumbers.push('...');
             }
        }

        // Always show Last page if different from first and not already included
        if (totalPages > 1 && !pageNumbers.includes(totalPages)) {
             pageNumbers.push(totalPages);
        }


    }

    // Ensure no duplicate ellipsis next to each other (can happen in edge cases)
    const finalPages = pageNumbers.filter((page, index) => page !== '...' || pageNumbers[index - 1] !== '...');

    return finalPages;
};
export default getPageNumbers