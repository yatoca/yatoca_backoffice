'use client'

import React from 'react'
import './styles.css'
import Wrapper from '@/components/basic/wrapper'
import SafeArea from '@/components/basic/safe-area'
import TopicsTable from './components/table/TopicsTable'
import DetailSideBar from '@/components/commons/detail-sidebar/DetailSideBar'
import AdminTopicForm from './components/form/AdminTopicForm'
import { AdminTopic } from '@/constants/types'
import KeywordFilter from '@/components/commons/keyword_filter/KeywordFilter'
import { useRouter } from 'next/navigation'


const PredefinedTopics: React.FC = () => {
    const router = useRouter();
    const [rows, setRows] = React.useState<AdminTopic[]>([]);
    const [total, setTotal] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const [rpp, setRpp] = React.useState(10);
    const [selectedPageIds, setSelectedPageIds] = React.useState<Set<string>>(new Set());
    ///
    const [loading, setLoading] = React.useState<boolean>(false);
    const [search, setSearch] = React.useState<string>("");
    const [keywords, setKeywords] = React.useState<number[]>([]);
    const [allKeywords, setAllKeywords] = React.useState([]);
    ///
    const [idToEdit, setIdToEdit] = React.useState<string>("");

    const fetch_keywords = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/keywords`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
            });
            const data = await res.json();
            setAllKeywords(data.keywords);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetch_data = React.useCallback(async (_search: string, _keywords: number[]) => {
        setLoading(true);
        try {
            let base_url = `/api/admin/topics?page=${page}&pageSize=${rpp}`;
            if (_search) base_url += `&search=${_search}`;
            if (_keywords.length > 0) base_url += `&keywords=${_keywords.join(',')}`;

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

    React.useEffect(() => { fetch_data(search, keywords); }, [fetch_data]);
    React.useEffect(() => { fetch_keywords(); }, [fetch_keywords]);
    return (
        <Wrapper>
            <div className="admin-topics">
                <SafeArea mv={32}>
                    <>
                        <div className="d-flex ais jcsb gap10">
                            <div className="w100" style={{ flex: 2.5 }}>
                                <h1 className="fs22 fw500 mb16">Temas predeterminados</h1>
                                <div className="d-flex gap10 aic jcsb">
                                    <input
                                        placeholder="Search"
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); }}
                                        className="w100"
                                        style={{ padding: 8, border: "1px solid #D6D6D6", borderRadius: 5, fontSize: 16 }}
                                        onKeyDown={(e: any) => { if (e.key === 'Enter') { setPage(1); fetch_data(e.target.value, keywords); } }}
                                    />
                                    <KeywordFilter
                                        options={allKeywords.map((keyword: any) => ({ id: keyword.id, label: keyword.keyword }))}            // [{id:number, label:string}]
                                        selected={keywords}              // number[]
                                        onChange={(ids) => setKeywords(ids)}
                                        apply={() => { setPage(1); fetch_data(search, keywords); }}
                                    />
                                </div>
                                <TopicsTable
                                    rows={rows}
                                    totalCount={total}
                                    page={page}
                                    rowsPerPage={rpp}
                                    loading={loading}
                                    selectedPageIds={selectedPageIds}
                                    setSelectedPageIds={setSelectedPageIds}
                                    onPageChange={setPage}
                                    onRowsPerPageChange={(n) => { setPage(1); setRpp(n); }}
                                    onView={(id) => router.push(`/admin/topics/${id}?name=${rows.find((row) => row.id === id)?.name}`)}
                                    onEdit={(id) => { setIdToEdit(id); }}
                                />
                            </div>
                            {idToEdit && <div style={{ flex: 1 }}><DetailSideBar onClose={() => { setIdToEdit(""); }}>
                                <AdminTopicForm topic={rows.find((row) => row.id === idToEdit)} />
                            </DetailSideBar></div>}
                        </div>
                    </>
                </SafeArea>
            </div>
        </Wrapper>
    )
}
export default PredefinedTopics
