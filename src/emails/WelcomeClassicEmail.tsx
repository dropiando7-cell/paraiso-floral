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

interface WelcomeClassicEmailProps {
    firstName: string;
    email: string;
    temporaryPassword?: string;
    loginUrl: string;
}

export const WelcomeClassicEmail = ({
    firstName,
    email,
    temporaryPassword,
    loginUrl,
}: WelcomeClassicEmailProps) => {
    const previewText = `¡Bienvenido a Sistemas Elim, ${firstName}!`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-slate-50 my-auto mx-auto font-sans px-2">
                    <Container className="border border-solid border-slate-200 rounded-2xl my-[40px] mx-auto p-[32px] w-[465px] bg-white shadow-sm">
                        <Section className="mt-[20px] mb-[32px]">
                            {/* TBD: Replace with actual logo URL once available online */}
                            <Text className="text-xl font-bold text-blue-600 text-center uppercase tracking-wider m-0">
                                Elim Honduras
                            </Text>
                            <Text className="text-sm font-medium text-slate-500 text-center m-0 mt-1">
                                Enterprise Platform
                            </Text>
                        </Section>
                        <Heading className="text-black text-[24px] font-bold text-center p-0 my-[30px] mx-0 text-slate-800 tracking-tight">
                            ¡Bienvenido a Sistemas Elim!
                        </Heading>
                        <Text className="text-slate-700 text-[15px] leading-[24px]">
                            Hola <strong>{firstName}</strong>,
                        </Text>
                        <Text className="text-slate-700 text-[15px] leading-[24px]">
                            Tu cuenta ha sido creada exitosamente por un administrador. Ahora tienes acceso a nuestra plataforma empresarial.
                        </Text>

                        <Section className="bg-slate-50 border border-slate-200 rounded-xl p-5 my-6">
                            <Text className="text-slate-900 text-[14px] leading-[20px] m-0 font-medium">
                                Tus credenciales de acceso:
                            </Text>
                            <Text className="text-slate-700 text-[14px] leading-[20px] m-0 mt-2">
                                <strong>Correo:</strong> {email}
                            </Text>
                            <Text className="text-slate-700 text-[14px] leading-[20px] m-0 mt-1">
                                <strong>Contraseña Temporal:</strong>{' '}
                                <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-900 font-semibold tracking-wider">
                                    {temporaryPassword}
                                </span>
                            </Text>
                        </Section>

                        <Text className="text-slate-700 text-[15px] leading-[24px]">
                            Por razones de seguridad, te recomendamos cambiar esta contraseña temporal en la sección <strong>Mi Perfil</strong> inmediatamente después de iniciar sesión.
                        </Text>

                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Button
                                className="bg-blue-600 rounded-xl text-white text-[14px] font-semibold no-underline text-center px-6 py-3 shadow-sm"
                                href={loginUrl}
                            >
                                Iniciar Sesión Ahora
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

export default WelcomeClassicEmail;
