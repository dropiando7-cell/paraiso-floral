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
} from '@react-email/components';
import React from 'react';

interface WelcomeGoogleEmailProps {
    firstName: string;
    email: string;
    loginUrl: string;
    logoUrl?: string | null;
    orgName?: string;
}

export const WelcomeGoogleEmail = ({
    firstName,
    email,
    loginUrl,
    logoUrl,
    orgName,
}: WelcomeGoogleEmailProps) => {
    const previewText = `¡Acceso concedido a ${orgName || 'Sistemas Elim'}, ${firstName}!`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-slate-50 my-auto mx-auto font-sans px-2">
                    <Container className="border border-solid border-slate-200 rounded-2xl my-[40px] mx-auto p-[32px] w-[465px] bg-white shadow-sm">
                        <Section className="mt-[20px] mb-[32px]">
                            {logoUrl ? (
                                <Img
                                    src={logoUrl}
                                    height="40"
                                    alt={orgName || 'Empresa'}
                                    className="my-0 mx-auto object-contain"
                                />
                            ) : (
                                <Text className="text-xl font-bold text-blue-600 text-center uppercase tracking-wider m-0">
                                    {orgName || 'Sistemas Elim'}
                                </Text>
                            )}
                        </Section>
                        <Heading className="text-black text-[24px] font-bold text-center p-0 my-[30px] mx-0 text-slate-800 tracking-tight">
                            ¡Acceso Concedido!
                        </Heading>
                        <Text className="text-slate-700 text-[15px] leading-[24px]">
                            Hola <strong>{firstName}</strong>,
                        </Text>
                        <Text className="text-slate-700 text-[15px] leading-[24px]">
                            Nos complace informarte que tu cuenta de Google Workspace (<strong>{email}</strong>) ha sido autorizada para ingresar a Sistemas Elim.
                        </Text>

                        <Section className="bg-slate-50 border border-slate-200 rounded-xl p-5 my-6 text-center">
                            <Text className="text-slate-700 text-[14px] leading-[20px] m-0">
                                Ya puedes ingresar a la plataforma utilizando el botón de "Continuar con Google". No necesitas contraseña.
                            </Text>
                        </Section>

                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Button
                                className="bg-slate-900 rounded-xl text-white text-[14px] font-semibold no-underline text-center px-6 py-3 shadow-sm border border-slate-800"
                                href={loginUrl}
                            >
                                Entrar con Google Workspace
                            </Button>
                        </Section>

                        <Text className="text-slate-500 text-[13px] leading-[24px] text-center">
                            Si tienes problemas para acceder, por favor contacta a soporte técnico.
                        </Text>
                        <Hr className="border border-solid border-slate-200 my-[26px] mx-0 w-full" />
                        <Text className="text-slate-400 text-[12px] leading-[24px] text-center">
                            Sistemas Elim © {new Date().getFullYear()} Iglesia de Cristo Elim Honduras
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default WelcomeGoogleEmail;
