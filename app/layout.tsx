import "./globals.css";

export const metadata = {
    title: "LFC GPT",
    description: "LFC GPT is a chatbot that can answer questions about LFC",
}

const rootLayout = ({children}) => {
    return (
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
    )
}
export default rootLayout;