import { useEffect } from "react";

const Pagination = ({ currentPage, pageCount, onPageChange, itemCount }) => {
    useEffect(() => {
        if (pageCount === 0 && currentPage !== 1) {
            onPageChange(1);
        } else if (pageCount > 0 && currentPage > pageCount) {
            onPageChange(pageCount);
        }
    }, [currentPage, onPageChange, pageCount]);

    if (pageCount <= 1) return null;

    const start = (currentPage - 1) * 25 + 1;
    const end = Math.min(start + itemCount - 1, pageCount * 25);

    return (
        <nav
            aria-label="Paginacja"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-3 py-4"
        >
            <span className="text-xs text-gray-500">
                {start}–{end} · strona {currentPage} z {pageCount}
            </span>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded border border-white/10 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 hover:cursor-pointer"
                >
                    Poprzednia
                </button>
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === pageCount}
                    className="rounded border border-white/10 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 hover:cursor-pointer"
                >
                    Następna
                </button>
            </div>
        </nav>
    );
};

export default Pagination;
