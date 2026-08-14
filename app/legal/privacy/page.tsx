import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export const metadata: Metadata = {
    title: '개인정보처리방침 | 버스대절',
};

const sections = [
    {
        title: '1. 수집하는 개인정보 항목',
        body: [
            '회사는 회원가입, 서비스 이용, 상담 및 민원 처리 과정에서 다음과 같은 개인정보를 수집합니다.',
            '필수항목: 이름, 휴대전화번호, 이메일, 아이디, 비밀번호',
            '서비스 이용 과정에서 추가로 수집되는 항목: 여정 정보(출발지·목적지·일정), 결제 정보, 사업자 정보(기사·버스회사회원의 경우 사업자등록번호 등)',
            '자동으로 수집되는 항목: 접속 IP, 쿠키, 서비스 이용기록, 기기정보',
        ],
    },
    {
        title: '2. 개인정보의 수집 및 이용목적',
        body: [
            '회원 식별 및 서비스 가입·이용에 따른 본인확인',
            '여정 등록, 입찰 비교, 이용계약 체결 및 결제 처리',
            '고객상담, 민원처리, 공지사항 전달',
            '부정이용 방지 및 서비스 품질 개선을 위한 통계·분석',
        ],
    },
    {
        title: '3. 개인정보의 보유 및 이용기간',
        body: [
            '회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 다만 관련 법령에 따라 보존할 필요가 있는 경우 아래와 같이 일정 기간 보관합니다.',
            '계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)',
            '대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)',
            '소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)',
            '접속에 관한 기록(로그인 기록): 3개월 (통신비밀보호법)',
        ],
    },
    {
        title: '4. 개인정보의 제3자 제공',
        body: [
            '회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 이용계약이 성립되어 서비스 제공에 필요한 최소한의 정보(연락처 등)를 계약 상대방인 회원에게 제공하는 경우, 이용자가 사전에 동의한 경우, 관련 법령에 근거하여 요구되는 경우에 한하여 예외로 합니다.',
        ],
    },
    {
        title: '5. 개인정보처리의 위탁',
        body: [
            '회사는 서비스 향상을 위해 결제 처리, 문자 발송 등 일부 업무를 외부 전문업체에 위탁하여 운영할 수 있습니다. 위탁계약 체결 시 개인정보가 안전하게 관리될 수 있도록 관련 법령에 따라 필요한 사항을 규정합니다.',
        ],
    },
    {
        title: '6. 이용자의 권리와 행사방법',
        body: [
            '이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회, 수정할 수 있으며 회원탈퇴를 통해 이용해지를 요청할 수 있습니다. 개인정보 조회, 수정, 삭제를 위해서는 고객센터를 통해 요청할 수 있습니다.',
        ],
    },
    {
        title: '7. 개인정보의 파기',
        body: [
            '회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다. 전자적 파일 형태는 복구할 수 없는 방법으로 영구 삭제하며, 종이에 출력된 개인정보는 분쇄하거나 소각하여 파기합니다.',
        ],
    },
    {
        title: '8. 개인정보 보호책임자',
        body: [
            '회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.',
            '성명: 최덕현',
            '연락처: choiuoz@naver.com / 1666-0533',
        ],
    },
    {
        title: '9. 고지의 의무',
        body: [
            '이 개인정보처리방침은 관련 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 시에는 시행 최소 7일 전에 서비스 내 공지사항을 통해 고지합니다.',
        ],
    },
];

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            <SiteHeader />

            <main className="mx-auto w-full max-w-3xl px-6 py-16">
                <p className="text-sm font-semibold text-[#2563eb]">약관 및 정책</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
                    개인정보처리방침
                </h1>
                <p className="mt-3 text-sm text-stone-400">시행일 2026년 8월 14일</p>

                <div className="mt-10 space-y-10">
                    {sections.map((section) => (
                        <section key={section.title}>
                            <h2 className="text-lg font-bold text-stone-900">
                                {section.title}
                            </h2>
                            <div className="mt-3 space-y-2">
                                {section.body.map((line) => (
                                    <p
                                        key={line}
                                        className="text-sm leading-relaxed text-stone-600"
                                    >
                                        {line}
                                    </p>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
