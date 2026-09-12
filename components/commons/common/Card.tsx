function Card({
    title,
    children,
    centerText,
    scrollY = false,
    maxBodyHeight = 520,
    minHeight = 400,
}: {
    title: string;
    children: React.ReactNode;
    centerText?: string;
    scrollY?: boolean;
    maxBodyHeight?: number;
    minHeight?: number;
}) {
    return (
        <div className="dash-card">
            <div className="dash-card-title">{title}</div>

            <div
                className="dash-card-body"
                style={
                    scrollY
                        ? {
                            maxHeight: maxBodyHeight,
                            minHeight: minHeight,
                            overflowY: "auto",
                            overflowX: "hidden",
                        }
                        : {
                            minHeight: minHeight,
                        }
                }
            >
                <div className="dash-chart-wrap">
                    {centerText ? <div className="dash-center-text">{centerText}</div> : null}
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Card;