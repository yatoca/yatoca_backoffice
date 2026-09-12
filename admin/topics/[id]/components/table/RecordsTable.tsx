'use client';

import React from "react";
import "./styles.css";
import moment from "moment";
import { TopicProcessedStatement } from "@/constants/types";


type ActionHandlers = {
    onView?: (id: string) => void;
    onEdit?: (id: string) => void;
};

type Props = ActionHandlers & {
    rows: TopicProcessedStatement[];                 // current page data
    totalCount: number;           // total rows (all pages)
    page: number;                 // 1-based
    rowsPerPage: number;
    rowsPerPageOptions?: number[];
    loading?: boolean;
    selectedPageIds: Set<string>;
    setSelectedPageIds: (ids: Set<string>) => void;

    onPageChange: (page: number) => void;
    onRowsPerPageChange: (n: number) => void;
};

/** Small helper checkbox with indeterminate */
function IndeterminateCheckbox({
    checked,
    indeterminate,
    onChange,
    title
}: {
    checked: boolean;
    indeterminate?: boolean;
    onChange: (v: boolean) => void;
    title?: string;
}) {
    const ref = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
        if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);
    return (
        <input
            ref={ref}
            type="checkbox"
            aria-label={title || "Select"}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
        />
    );
}

const RecordsTable: React.FC<Props> = ({
    rows,
    totalCount,
    page,
    rowsPerPage,
    rowsPerPageOptions = [10, 25, 50, 100],
    loading = false,
    selectedPageIds,
    setSelectedPageIds,
    onPageChange,
    onRowsPerPageChange,
    onView,
    onEdit,
}) => {
    // Selection state
    const [selectAllAcross, setSelectAllAcross] = React.useState<boolean>(false);

    const [deselected, setDeselected] = React.useState<Set<string>>(new Set()); // only used when selectAllAcross=true

    // Reset page selections whenever page/rows change
    React.useEffect(() => {
        setSelectedPageIds(new Set());
        setDeselected(new Set());
        setSelectAllAcross(false);
    }, [page, rowsPerPage]);

    const pageAllIds = React.useMemo(() => rows.map(r => r.id), [rows]);

    // Computed selection info
    const pageSelectedCount = selectAllAcross
        ? pageAllIds.filter(id => !deselected.has(id)).length
        : selectedPageIds.size;

    const pageAllSelected = pageSelectedCount === pageAllIds.length && pageAllIds.length > 0;
    const pageNoneSelected = pageSelectedCount === 0;

    const headerChecked = pageAllSelected;
    const headerIndeterminate = !pageNoneSelected && !pageAllSelected;

    // Handlers
    const toggleHeader = (checked: boolean) => {
        if (selectAllAcross) {
            // when selecting header on this page in "across" mode, simply clear or add all from deselected
            if (checked) {
                const next = new Set(deselected);
                pageAllIds.forEach(id => next.delete(id));
                setDeselected(next);
            } else {
                const next = new Set(deselected);
                pageAllIds.forEach(id => next.add(id));
                setDeselected(next);
            }
        } else {
            // page mode
            if (checked) {
                setSelectedPageIds(new Set(pageAllIds));
            } else {
                setSelectedPageIds(new Set());
            }
        }
    };

    const toggleRow = (id: string, checked: boolean) => {
        if (selectAllAcross) {
            const next = new Set(deselected);
            if (checked) next.delete(id);
            else next.add(id);
            setDeselected(next);
        } else {
            const next = new Set(selectedPageIds);
            if (checked) next.add(id);
            else next.delete(id);
            setSelectedPageIds(next);
        }
    };

    const selectAllAcrossDataset = () => {
        setSelectAllAcross(true);
        setSelectedPageIds(new Set());
        setDeselected(new Set()); // everything selected unless explicit exceptions
    };

    const clearSelection = () => {
        setSelectAllAcross(false);
        setSelectedPageIds(new Set());
        setDeselected(new Set());
    };

    // Pagination helpers
    const pageStart = (page - 1) * rowsPerPage + 1;
    const pageEnd = Math.min(page * rowsPerPage, totalCount);
    const pageCount = Math.max(1, Math.ceil(totalCount / rowsPerPage));

    // Row actions menu state (controlled per-row)
    const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
    const toggleMenu = (id: string) => setOpenMenuId(m => (m === id ? null : id));
    const closeMenu = () => setOpenMenuId(null);

    return (
        <div className="topics-card">
            {/* “Select all across” banner */}
            {!pageNoneSelected && !selectAllAcross && totalCount > rows.length && (
                <>
                    <div className="select-banner">
                        Selected {pageSelectedCount} in this page.{" "}
                        <button className="link" onClick={selectAllAcrossDataset}>
                            Select all {totalCount} roles
                        </button>
                        {" · "}
                        <button className="link" onClick={clearSelection}>Clear selection</button>
                        {" · "}
                        {/* <button
                            className="danger"
                            onClick={() => onBulkExport?.(Array.from(selectedPageIds))}
                        >
                            Export ({pageSelectedCount})
                        </button> */}
                    </div>
                </>
            )}
            {/* {selectAllAcross && (
                <div className="select-banner">
                    Selected all {totalCount} roles.{" "}
                    <button className="link" onClick={clearSelection}>Clear selection</button>
                    {" · "}
                    <button
                        className="danger"
                        onClick={() => onBulkExport?.(Array.from(selectedPageIds))}
                    >
                        Export ({totalCount})
                    </button>
                </div>
            )} */}

            <div className="topics-table" role="table" aria-label="Topic Processed Statements">
                {/* Header */}
                <div className="tr th" role="row">
                    <div className="td checkbox">
                        <IndeterminateCheckbox
                            title="Select all"
                            checked={headerChecked}
                            indeterminate={headerIndeterminate}
                            onChange={toggleHeader}
                        />
                    </div>
                    <div className="td name">Statement</div>
                    <div className="td desc">Age Group</div>
                    <div className="td desc">Region</div>
                    <div className="td desc">Source Table</div>
                    <div className="td desc">Gender</div>
                    <div className="td desc">Date</div>
                    <div className="td actions" aria-hidden />
                </div>

                {/* Body */}
                {loading ? (
                    <div className="tr">
                        <div className="td loading" col-span={5}>Loading...</div>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="tr">
                        <div className="td empty">No topics.</div>
                    </div>
                ) : (
                    rows.map((r) => {
                        const rowChecked = selectAllAcross ? !deselected.has(r.id) : selectedPageIds.has(r.id);
                        return (
                            <div key={r.id} className="tr" role="row">
                                <div className="td checkbox">
                                    <input
                                        type="checkbox"
                                        aria-label={`Select ${r.id}`}
                                        checked={rowChecked}
                                        onChange={(e) => toggleRow(r.id, e.target.checked)}
                                    />
                                </div>

                                <div className="td name">{r.text}</div>

                                <div className="td desc">{r.age_group}</div>

                                <div className="td keywords">{r.region}</div>

                                <div className="td keywords">{r.source_table}</div>

                                <div className="td keywords">{r.gender}</div>

                                <div className="td keywords">{moment(r.date).format('YYYY-MM-DD')}</div>

                                <div className="td actions">
                                    <button
                                        className="icon-btn"
                                        aria-haspopup="menu"
                                        aria-expanded={openMenuId === r.id}
                                        onClick={() => toggleMenu(r.id)}
                                    >
                                        ⋮
                                    </button>
                                    {openMenuId === r.id && (
                                        <div className="menu" role="menu" onMouseLeave={closeMenu}>
                                            <button className="menuitem" role="menuitem" onClick={() => { closeMenu(); onView?.(r.id); }}>
                                                View Topic
                                            </button>
                                            <button className="menuitem" role="menuitem" onClick={() => { closeMenu(); onEdit?.(r.id); }}>
                                                Edit Topic
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer / Pagination */}
            <div className="table-footer">
                <div className="rows-per-page">
                    <select
                        value={rowsPerPage}
                        onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                    >
                        {rowsPerPageOptions.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>

                <div className="range">
                    {totalCount === 0 ? "0–0" : `${pageStart}–${pageEnd}`} of {totalCount}
                </div>

                <div className="pager">
                    <button
                        className="nav"
                        disabled={page <= 1}
                        onClick={() => onPageChange(1)}
                        aria-label="First page"
                    >«</button>
                    <button
                        className="nav"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                        aria-label="Previous page"
                    >‹</button>
                    <span className="pageno">{page} / {pageCount}</span>
                    <button
                        className="nav"
                        disabled={page >= pageCount}
                        onClick={() => onPageChange(page + 1)}
                        aria-label="Next page"
                    >›</button>
                    <button
                        className="nav"
                        disabled={page >= pageCount}
                        onClick={() => onPageChange(pageCount)}
                        aria-label="Last page"
                    >»</button>
                </div>
            </div>
        </div>
    );
};

export default RecordsTable;
