'use client'

import React from 'react'
import './styles.css'
import Wrapper from '@/components/basic/wrapper'
import SafeArea from '@/components/basic/safe-area'
import { AdminTopic, UnprocessedRecord } from '@/constants/types'
import RecordsTable from './components/table/RecordsTable'
import FeedbackModal from '@/components/_vl-components/modals/FeedbackModal'
import TopicsFilter from '@/components/commons/topics_filter/TopicsFilter'
import DateRangePicker from '@/components/commons/date-range-picker/DateRangePicker'


const UnprocessedStatements: React.FC = () => {
    const [rows, setRows] = React.useState<UnprocessedRecord[]>([]);
    const [total, setTotal] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const [rpp, setRpp] = React.useState(10);
    const [selectedPageIds, setSelectedPageIds] = React.useState<Set<string>>(new Set());
    const [topics, setTopics] = React.useState<number[]>([]);
    const [allTopics, setAllTopics] = React.useState<AdminTopic[]>([]);
    ///
    const [loading, setLoading] = React.useState<boolean>(false);
    const [search, setSearch] = React.useState<string>("");
    const [start, setStart] = React.useState('')
    const [end, setEnd] = React.useState('')
    ///
    const [idToEdit, setIdToEdit] = React.useState<string>("");
    const [successAlert, setSuccessAlert] = React.useState<null | { title: string; message: string }>(null);

    const fetch_topics = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/topics?page=${page}&pageSize=1000`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
            });
            const data = await res.json();
            setAllTopics(data.rows);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetch_data = React.useCallback(async (_search: string, _topics: number[], _start: string, _end: string) => {
        setLoading(true);
        try {
            let base_url = `/api/analytics/unprocessed-statements?page=${page}&pageSize=${rpp}`;
            if (_search) base_url += `&search=${_search}`;
            if (_topics) base_url += `&topics=${_topics.join(',')}`;
            if (_start) base_url += `&from=${_start}`;
            if (_end) base_url += `&to=${_end}`;

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

    const handleApprove = React.useCallback(async (id: string, topic_id: number) => {
        setLoading(true);
        try {
            await fetch(`/api/analytics/unprocessed-statements/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ stmt_id: id, topic_id })
            });
            setSuccessAlert({ message: "Declaración aprobada", title: "Exito" });
            setRows(rows.filter((row) => row.id !== id));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [rows]);

    React.useEffect(() => { fetch_data(search, topics, start, end); }, [fetch_data]);
    React.useEffect(() => { fetch_topics(); }, [fetch_topics]);
    return (
        <Wrapper>
            <div className="admin-topics">
                <SafeArea mv={32}>
                    <>
                        <div className="d-flex ais jcsb gap10">
                            <div className="w100" style={{ flex: 2.5 }}>
                                <h1 className="fs22 fw500 mb16">Declaraciones pendientes</h1>
                                <div className="d-flex gap10 aic jcsb">
                                    <input
                                        placeholder="Search"
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); }}
                                        className="w100"
                                        style={{ padding: 8, border: "1px solid #D6D6D6", borderRadius: 5, fontSize: 16 }}
                                        onKeyDown={(e: any) => { if (e.key === 'Enter') { setPage(1); fetch_data(e.target.value, topics, start, end); } }}
                                    />
                                    <TopicsFilter
                                        options={allTopics.map((topic: any) => ({ id: topic.id, label: topic.name }))}
                                        selected={topics}
                                        onChange={(ids) => setTopics(ids)}
                                        apply={() => { setPage(1); fetch_data(search, topics, start, end); }}
                                    />
                                </div>
                                <br />
                                <DateRangePicker
                                    start={start}
                                    end={end}
                                    setStart={setStart}
                                    setEnd={setEnd}
                                    onApply={(start, end) => { setPage(1); fetch_data(search, topics, start, end); }}
                                    onReset={() => {
                                        setPage(1);
                                        fetch_data(search, topics, '', '');
                                        setStart('');
                                        setEnd('');
                                    }}
                                />
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
                                    onView={() => { }}
                                    onEdit={(id) => { setIdToEdit(id); }}
                                    onApprove={(id, topic_id) => { handleApprove(id, topic_id); }}
                                    topics={allTopics}
                                />
                            </div>
                            {/* {idToEdit && <div style={{ flex: 1 }}><DetailSideBar onClose={() => { setIdToEdit(""); }}>
                                <AdminTopicForm topic={rows.find((row) => row.id === idToEdit)} />
                            </DetailSideBar></div>} */}
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
export default UnprocessedStatements
