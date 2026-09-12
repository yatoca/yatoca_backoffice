'use client'

import React, { Suspense } from 'react'
import './styles.css'
import Wrapper from '@/components/basic/wrapper'
import SafeArea from '@/components/basic/safe-area'
import { TopicProcessedStatement } from '@/constants/types'
import KeywordFilter from '@/components/commons/keyword_filter/KeywordFilter'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import RecordsTable from './components/table/RecordsTable'


const TopicDetailClient: React.FC = () => {
    const topic = useSearchParams().get('name');
    console.log(topic);
    const router = useRouter();
    const params = useParams();
    const id = params.id;
    const [rows, setRows] = React.useState<TopicProcessedStatement[]>([]);
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
    const [idToView, setIdToView] = React.useState<string>("");

    const fetch_data = React.useCallback(async () => {
        setLoading(true);
        try {
            let base_url = `/api/admin/topics/${id}/processed-statements?id=${id}`;

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
    }, []);

    // const fetch_statements_data = React.useCallback(async (_search: string, _keywords: number[]) => {
    //     setLoading(true);
    //     try {
    //         let base_url = `/api/admin/statements?page=${page}&pageSize=${rpp}`;
    //         if (_search) base_url += `&search=${_search}`;
    //         if (_keywords.length > 0) base_url += `&keywords=${_keywords.join(',')}`;

    //         const res = await fetch(`${base_url}`, {
    //             method: 'GET',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Accept': 'application/json'
    //             },
    //         });
    //         const data = await res.json();
    //         setRows(data.rows);
    //         setTotal(data.total);
    //     } catch (error) {
    //         console.error(error);
    //     } finally {
    //         setLoading(false);
    //     }
    // }, [page, rpp]);

    React.useEffect(() => { fetch_data(); }, [fetch_data]);

    return (
        <Wrapper>
            <div className="admin-topics">
                <SafeArea mv={32}>
                    <>
                        <div className="d-flex ais jcsb gap10">
                            <div className="w100" style={{ flex: 2.5 }}>
                                <h1 className="fs22 fw500 mb16">{topic} - Declaraciones Procesadas</h1>
                                <div className="d-flex gap10 aic jcsb">
                                    <input
                                        placeholder="Search"
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); }}
                                        className="w100"
                                        style={{ padding: 8, border: "1px solid #D6D6D6", borderRadius: 5, fontSize: 16 }}
                                        onKeyDown={(e: any) => { if (e.key === 'Enter') { } }}
                                    />
                                    <KeywordFilter
                                        options={allKeywords.map((keyword: any) => ({ id: keyword.id, label: keyword.keyword }))}            // [{id:number, label:string}]
                                        selected={keywords}              // number[]
                                        onChange={(ids) => setKeywords(ids)}
                                        apply={() => { }}
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
                                    onView={(id) => { setIdToView(id); }}
                                />
                            </div>
                        </div>
                    </>
                </SafeArea>
            </div>
        </Wrapper>
    )
}

function TopicDetail() {
    return (
        <Suspense fallback={null}>
            <TopicDetailClient />
        </Suspense>
    );
}
export default TopicDetail
