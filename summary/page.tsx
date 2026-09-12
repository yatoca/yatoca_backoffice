'use client'
import React, { Suspense } from 'react'
import './styles.css'
import SafeArea from '@/components/basic/safe-area'
import { useSearchParams } from 'next/navigation'
import { example_summary } from '@/constants'
import Wrapper from '@/components/basic/wrapper'
import { BackArrowSVG } from '@/constants/svgs'
import { useRouter } from 'next/navigation'
import SummaryChat from '@/components/basic/summary-chat'

const SummaryClient: React.FC = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const select1 = searchParams.get('selection1');
    const select2 = searchParams.get('selection2');

    const [selection1, setSelection1] = React.useState<string | null>(select1);
    const [selection2, setSelection2] = React.useState<string | null>(select2);
    return (
        <Wrapper>
            <div className="summary">
                <SummaryChat
                    selection1={selection1}
                    selection2={selection2}
                    handle_compare={(select1, select2) => {
                        setSelection1(select1);
                        setSelection2(select2);
                    }}
                    handle_reset={() => {
                        setSelection1(null);
                        setSelection2(null);
                    }}
                />
                <SafeArea mv={32}>
                    <>
                        <div className="d-flex flex-col gap">
                            <div onClick={() => router.back()} className="pointer"><BackArrowSVG /></div>
                            {(!selection1 || !selection2) && (
                                <div>Selecciona dos parametros para comparar</div>
                            )}
                            {selection1 && selection2 && (
                                <>
                                    <div className="d-flex jce w100 gap">
                                        <div className="flex1 w100 fs16 fw700" />
                                        <div className="d-flex aic gap8 flex2 w100">
                                            <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#FFC107' }} />
                                            <div className="fs16 fw700">{selection1}</div>
                                        </div>
                                        <div className="d-flex aic gap8 flex2 w100">
                                            <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#FFC107' }} />
                                            <div className="fs16 fw700">{selection2}</div>
                                        </div>
                                    </div>
                                    <br />
                                    <div className="d-flex jce w100 gap">
                                        <div className="flex1 w100 fs16 fw700 tac">Resumen Descriptivo:</div>
                                        <div className="d-flex aic gap8 flex2 w100">
                                            <div>{example_summary}</div>
                                        </div>
                                        <div className="d-flex aic gap8 flex2 w100">
                                            <div>{example_summary}</div>
                                        </div>
                                    </div>
                                    <div style={{ height: 1, width: '100%', marginTop: 16, marginBottom: 16 }} />
                                    <div className="d-flex jce w100 gap">
                                        <div className="flex1 w100 fs16 fw700 tac">Resumen Descriptivo:</div>
                                        <div className="d-flex aic gap8 flex2 w100">
                                            <div>{example_summary}</div>
                                        </div>
                                        <div className="d-flex aic gap8 flex2 w100">
                                            <div>{example_summary}</div>
                                        </div>
                                    </div>
                                    <div style={{ height: 1, width: '100%', marginTop: 16, marginBottom: 16 }} />
                                    <div className="d-flex jce w100 gap">
                                        <div className="flex1 w100 fs16 fw700 tac">Resumen Descriptivo:</div>
                                        <div className="d-flex aic gap8 flex2 w100">
                                            <div>{example_summary}</div>
                                        </div>
                                        <div className="d-flex aic gap8 flex2 w100">
                                            <div>{example_summary}</div>
                                        </div>
                                    </div>
                                    <div style={{ height: 1, width: '100%', marginTop: 16, marginBottom: 16 }} />
                                </>
                            )}
                        </div>
                    </>
                </SafeArea>
            </div>
        </Wrapper>
    )
}
function Summary() {
    return (
        <Suspense fallback={null}>
            <SummaryClient />
        </Suspense>
    );
}
export default Summary