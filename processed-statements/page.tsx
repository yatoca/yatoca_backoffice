'use client'

import React from 'react'
import './styles.css'
import Wrapper from '@/components/basic/wrapper'
import SafeArea from '@/components/basic/safe-area'
import { ProcessedStatement } from '@/constants/types'
import RecordsTable from './components/table/RecordsTable'
import FeedbackModal from '@/components/_vl-components/modals/FeedbackModal'


const ProcessedStatements: React.FC = () => {
    const [rows, setRows] = React.useState<ProcessedStatement[]>([]);
    const [total, setTotal] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const [rpp, setRpp] = React.useState(10);
    const [selectedPageIds, setSelectedPageIds] = React.useState<Set<string>>(new Set());
    ///
    const [loading, setLoading] = React.useState<boolean>(false);
    const [search, setSearch] = React.useState<string>("");
    ///
    const [idToEdit, setIdToEdit] = React.useState<string>("");
    const [successAlert, setSuccessAlert] = React.useState<null | { title: string; message: string }>(null);

    const fetch_data = React.useCallback(async (_search: string) => {
        setLoading(true);
        try {
            let base_url = `/api/analytics/processed-statements?page=${page}&pageSize=${rpp}`;
            if (_search) base_url += `&search=${_search}`;

            const res = await fetch(`${base_url}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
            });
            const data = await res.json();
            setRows(data.rows);
            setTotal(data.total);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [page, rpp]);

    React.useEffect(() => { fetch_data(search); }, [fetch_data]);
    return (
        <Wrapper>
            <div className="admin-topics">
                <SafeArea mv={32}>
                    <>
                        <div className="d-flex ais jcsb gap10">
                            <div className="w100" style={{ flex: 2.5 }}>
                                <h1 className="fs22 fw500 mb16">Declaraciones procesadas</h1>
                                <div className="d-flex gap10 aic jcsb">
                                    <input
                                        placeholder="Search"
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); }}
                                        className="w100"
                                        style={{ padding: 8, border: "1px solid #D6D6D6", borderRadius: 5, fontSize: 16 }}
                                        onKeyDown={(e: any) => { if (e.key === 'Enter') { setPage(1); fetch_data(e.target.value); } }}
                                    />
                                </div>
                                <RecordsTable
                                    rows={rows}
                                    totalCount={total}
                                    page={page}
                                    rowsPerPage={rpp}
                                    loading={loading}
                                    selectedPageIds={selectedPageIds}
                                    setSelectedPageIds={setSelectedPageIds}
                                    onPageChange={setPage}
                                    onRowsPerPageChange={(n) => { setPage(1); setRpp(n); }}
                                />
                            </div>
                        </div>
                    </>
                </SafeArea>
                <FeedbackModal
                    open={!!successAlert}
                    title={successAlert?.title}
                    message={successAlert?.message}
                    autoCloseMs={2000}
                    onClose={() => setSuccessAlert(null)}
                />
            </div>
        </Wrapper>
    )
}
export default ProcessedStatements
