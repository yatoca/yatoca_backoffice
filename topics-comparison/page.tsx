'use client'
import React, { Suspense } from 'react'
import './styles.css'
import SafeArea from '@/components/basic/safe-area'
import { useSearchParams } from 'next/navigation'
import { example_summary } from '@/constants'
import TopicComparisonChat from '@/components/basic/topic-comparison-chat'
import Wrapper from '@/components/basic/wrapper'
import { BackArrowSVG } from '@/constants/svgs'
import { useRouter } from 'next/navigation'

const TopicsComparisonClient: React.FC = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const selection1 = searchParams.get('selection1');
    const selection2 = searchParams.get('selection2');
    const topics = [
        {
            name: 'Acceso a la educación superior y becas',
            selection1: { value: 750, color: '#E53016' },
            selection2: { value: 500, color: '#EABF00' },
        },
        {
            name: 'Alianzas y acciones colaborativas',
            selection1: { value: 600, color: '#E53016' },
            selection2: { value: 800, color: '#EABF00' },
        },
        {
            name: 'Movilizaciones sociales',
            selection1: { value: 1200, color: '#E53016' },
            selection2: { value: 560, color: '#EABF00' },
        },
    ];
    return (
        <Wrapper>
            <div className="topics-comparison">
                <TopicComparisonChat />
                <SafeArea mv={32}>
                    <>
                        <div className="d-flex flex-col gap">
                            <div onClick={() => router.back()} className="pointer"><BackArrowSVG /></div>
                            <div className="d-flex jce w100 gap">
                                <div className="flex1 w100 fs16 fw700" />
                                <div className="d-flex aic gap8 flex1 w100">
                                    <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#FFC107' }} />
                                    <div className="fs16 fw700">{selection1}</div>
                                </div>
                                <div className="d-flex aic gap8 flex1 w100">
                                    <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#FFC107' }} />
                                    <div className="fs16 fw700">{selection2}</div>
                                </div>
                            </div>
                            <br />
                            <div className="d-flex jce w100 gap">
                                <div className="flex1 w100 fs16 fw700 tac">Resumen Descriptivo:</div>
                                <div className="d-flex aic gap8 flex1 w100">
                                    <div>{example_summary}</div>
                                </div>
                                <div className="d-flex aic gap8 flex1 w100">
                                    <div>{example_summary}</div>
                                </div>
                            </div>
                            <div style={{ height: 1, width: '100%', marginTop: 16, marginBottom: 16 }} />
                            <div className="d-flex jce w100 gap">
                                <div className="flex1 w100 fs16 fw700 tac">Resumen Descriptivo:</div>
                                <div className="d-flex aic gap8 flex1 w100">
                                    <div>{example_summary}</div>
                                </div>
                                <div className="d-flex aic gap8 flex1 w100">
                                    <div>{example_summary}</div>
                                </div>
                            </div>
                            <div style={{ height: 1, width: '100%', marginTop: 16, marginBottom: 16 }} />
                            <div className="d-flex jce w100 gap">
                                <div className="flex1 w100 fs16 fw700 tac">Resumen Descriptivo:</div>
                                <div className="d-flex aic gap8 flex1 w100">
                                    <div>{example_summary}</div>
                                </div>
                                <div className="d-flex aic gap8 flex1 w100">
                                    <div>{example_summary}</div>
                                </div>
                            </div>
                            <div style={{ height: 1, width: '100%', marginTop: 16, marginBottom: 16 }} />
                        </div>
                    </>
                </SafeArea>
            </div>
        </Wrapper>
    )
}
function TopicsComparison() {
    return (
        <Suspense fallback={null}>
            <TopicsComparisonClient />
        </Suspense>
    );
}
export default TopicsComparison