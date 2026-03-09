import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Tailwind,
} from "@react-email/components";
import * as React from "react";
import { EmailTemplateType } from "@prisma/client";

interface WelcomeEmailDynamicProps {
    type: EmailTemplateType;
    title: string;
    body: string;
    buttonText: string;
    loginUrl: string;

    // Variables for body injection
    firstName: string;
    email: string;
    password?: string;
}

export const WelcomeEmailDynamic = ({
    type,
    title,
    body,
    buttonText,
    loginUrl,

    firstName,
    email,
    password,
}: WelcomeEmailDynamicProps) => {

    // Reemplazar dinámicamente las variables en el texto
    let parsedBody = body.replace(/{{firstName}}/g, firstName);
    parsedBody = parsedBody.replace(/{{email}}/g, email);
    if (password) {
        parsedBody = parsedBody.replace(/{{password}}/g, password);
    } else {
        parsedBody = parsedBody.replace(/{{password}}/g, '********');
    }

    // Convertir saltos de línea a elementos <br/>
    const bodyParagraphs = parsedBody.split('\n').map((text, i) => (
        <React.Fragment key={i}>
            {text}
            <br />
        </React.Fragment>
    ));

    return (
        <Html>
            <Head />
            <Preview>{title}</Preview>
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                brand: {
                                    50: '#ecfdf5',
                                    100: '#d1fae5',
                                    500: '#10b981',
                                    600: '#059669',
                                    700: '#047857',
                                    900: '#064e3b',
                                },
                            },
                        },
                    },
                }}
            >
                <Body className="bg-slate-50 my-auto mx-auto font-sans px-2">
                    <Container className="border border-solid border-slate-200 rounded-lg my-[40px] mx-auto p-[20px] max-w-[465px] bg-white text-center shadow-sm">

                        <Section className="mt-[32px] mb-[24px]">
                            <Img
                                src="https://pub-e9f7db97630d40fe816c341284149436.r2.dev/images/logo-sistemas-elim-azul.png"
                                width="150"
                                alt="Sistemas Elim"
                                className="my-0 mx-auto"
                            />
                        </Section>

                        <Heading className="text-slate-900 text-[24px] font-bold text-center p-0 my-[24px] mx-0 font-sans tracking-tight">
                            {title}
                        </Heading>

                        <Text className="text-slate-700 text-[14px] leading-[24px] text-left px-4">
                            {bodyParagraphs}
                        </Text>

                        <Section className="bg-slate-50 border border-slate-100 rounded-lg p-4 my-6 mx-4">
                            <Text className="text-sm font-semibold text-slate-900 m-0 mb-2">Credenciales de Acceso:</Text>
                            <Text className="text-sm text-slate-700 m-0 mb-1">
                                <strong>Correo:</strong> {email}
                            </Text>

                            {type === 'CLASSIC_WELCOME' ? (
                                <Text className="text-sm text-slate-700 m-0">
                                    <strong>Contraseña Temporal:</strong> <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">{password}</code>
                                </Text>
                            ) : (
                                <Text className="text-sm text-slate-600 m-0 mt-3 italic">
                                    Tu cuenta está protegida por Google Workspace. No necesitas contraseña.
                                </Text>
                            )}
                        </Section>

                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Button
                                className="bg-brand-600 rounded-md text-white text-[14px] font-semibold no-underline text-center px-6 py-3"
                                href={loginUrl}
                            >
                                {buttonText}
                            </Button>
                        </Section>

                        <Hr className="border border-solid border-slate-200 my-[26px] mx-0 w-full" />
                        <Text className="text-slate-500 text-[12px] leading-[20px] text-center">
                            Este es un mensaje automático generado por Sistemas Elim.<br />
                            Por favor no respondas a este correo.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default WelcomeEmailDynamic;
