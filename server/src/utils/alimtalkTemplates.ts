export type AlimtalkButton = {
    name: string;
    linkMo: string;
    linkPc: string;
};

export type AlimtalkTemplate = {
    tplCode: string;
    body: string;
    fallbackSubject: string;
    fallbackText: string;
    button?: AlimtalkButton;
};

const PASSENGER_DASHBOARD_URL = 'https://busrent.co.kr/dashboard/passenger';
const DRIVER_DASHBOARD_URL = 'https://busrent.co.kr/dashboard/driver';
const SITE_URL = 'https://busrent.co.kr';

export const ALIMTALK_TEMPLATES = {
    WELCOME: {
        tplCode: 'UM_1769',
        body: [
            '[버스대절 주식회사]',
            '',
            '#{고객명}님, 버스대절 회원가입을 환영합니다.',
            '',
            '여정 견적과 입찰 내역을 한곳에서 편하게 확인하실 수 있습니다.',
            '',
            "※ 견적등록 알림을 받고 싶지 않으시면 로그인 후 알림 설정에서 '견적등록 알림'을 꺼주세요.",
        ].join('\n'),
        fallbackSubject: '버스대절 회원가입 안내',
        fallbackText:
            '[버스대절] #{고객명}님, 버스대절 회원가입을 환영합니다. 여정 견적과 입찰 내역을 한곳에서 확인하실 수 있습니다.',
        button: {
            name: '버스대절 바로가기',
            linkMo: SITE_URL,
            linkPc: SITE_URL,
        },
    },
    BID_ARRIVED: {
        tplCode: 'UL_9798',
        body: [
            '[버스대절 주식회사]',
            '',
            '#{고객명}님, 등록하신 여정에 새 입찰이 도착했습니다.',
            '',
            '■ 여정 정보',
            '- 출발지 : #{출발지}',
            '- 도착지 : #{도착지}',
            '- 출발 : #{출발일시}',
            '',
            '■ 입찰 정보',
            '- 입찰 금액 : #{입찰금액}',
            '- 입찰자 : #{입찰자명}',
            '',
            '받으신 입찰을 확인하고 비교해 보세요.',
            '',
            '※ 본 메시지는 고객님께서 입찰 알림 수신에 동의하신 여정에 한해, 새 입찰이 등록될 때마다 발송됩니다.',
        ].join('\n'),
        fallbackSubject: '버스대절 입찰 알림',
        fallbackText:
            '[버스대절] #{고객명}님, 등록하신 여정(#{출발지}→#{도착지})에 새 입찰(#{입찰금액}, #{입찰자명})이 도착했습니다. 앱에서 확인하세요.',
        button: {
            name: '입찰 확인하기',
            linkMo: PASSENGER_DASHBOARD_URL,
            linkPc: PASSENGER_DASHBOARD_URL,
        },
    },
    BID_MILESTONE: {
        tplCode: 'UM_0482',
        body: [
            '[버스대절 주식회사]',
            '',
            '#{고객명}님의 여정에 입찰이',
            '총 #{입찰건수}건 등록되었습니다.',
            '',
            '여정 정보 보기 버튼으로',
            '전체 입찰 내역을 확인하세요.',
            '',
            '※ 본 메시지는 고객님께서 입찰 알림 수신에 동의하신 여정에 한해, 입찰 건수 알림은 최대 10건까지만 발송됩니다.',
        ].join('\n'),
        fallbackSubject: '버스대절 입찰 알림',
        fallbackText:
            '[버스대절] #{고객명}님의 여정에 입찰이 총 #{입찰건수}건 등록되었습니다. 앱에서 전체 입찰 내역을 확인하세요.',
        button: {
            name: '여정 정보 보기',
            linkMo: PASSENGER_DASHBOARD_URL,
            linkPc: PASSENGER_DASHBOARD_URL,
        },
    },
    AWARD_COMPLETED: {
        tplCode: 'UL_9741',
        body: [
            '[버스대절 주식회사]',
            '',
            '#{기사명} 기사님, 축하드립니다.',
            '기사님께서 입찰하신 주문이 낙찰되었습니다.',
            '',
            '■ 운행요금 안내',
            '- 총 요금 : #{총요금}',
            '- 입찰 운행요금 : #{운행요금}',
            '- 부가 서비스 요금 : #{부가서비스요금}',
            '',
            '■ 포함사항',
            '#{포함사항}',
            '',
            '■ 결제방법',
            '#{결제방법}',
            '',
            '■ 고객님 연락처',
            '- 이름 : #{고객명}',
            '- 연락처 : #{고객연락처}',
            '',
            '■ 운행 정보',
            '- 출발지 : #{출발지}',
            '- 도착지 : #{도착지}',
            '- 출발 : #{출발일시}',
            '- 귀환 : #{귀환일시}',
            '- 차량 : #{차량정보}',
            '- 운행형태 : #{운행형태}',
            '- 인원 : #{인원}명',
            '',
            '운행 전 고객님께 연락하여 정확한 탑승 장소와 시간을 확인해 주세요.',
            '',
            '부당한 방법으로 수수료를 면탈하거나 고객에게 별도의 계약을 요구하는 행위가 확인되는 경우 서비스 이용이 제한될 수 있습니다.',
        ].join('\n'),
        fallbackSubject: '버스대절 낙찰 안내',
        fallbackText:
            '[버스대절] #{기사명} 기사님, 축하드립니다. #{출발지}→#{도착지}(#{출발일시}) 여정이 낙찰되었습니다. 앱에서 고객 연락처와 운행 정보를 확인하세요.',
        button: {
            name: '낙찰주문 확인',
            linkMo: DRIVER_DASHBOARD_URL,
            linkPc: DRIVER_DASHBOARD_URL,
        },
    },
    AWARD_CONFIRMED: {
        tplCode: 'UL_9799',
        body: [
            '[버스대절 주식회사]',
            '',
            '#{고객명}님, 여정에 기사님이 확정되었습니다.',
            '',
            '■ 확정된 기사 정보',
            '- 기사명 : #{기사명}',
            '- 연락처 : #{기사연락처}',
            '- 차량 : #{차량정보}',
            '',
            '■ 운행 정보',
            '- 출발지 : #{출발지}',
            '- 도착지 : #{도착지}',
            '- 출발 : #{출발일시}',
            '- 귀환 : #{귀환일시}',
            '',
            '운행 전 기사님과 탑승 장소·시간을 미리 확인해 주세요.',
        ].join('\n'),
        fallbackSubject: '버스대절 낙찰 확정 안내',
        fallbackText:
            '[버스대절] #{고객명}님, 여정(#{출발지}→#{도착지})에 기사님(#{기사명}, #{기사연락처})이 확정되었습니다. 앱에서 확인하세요.',
        button: {
            name: '여정 상세 보기',
            linkMo: PASSENGER_DASHBOARD_URL,
            linkPc: PASSENGER_DASHBOARD_URL,
        },
    },
    TRIP_CANCELLED: {
        tplCode: 'UL_9743',
        body: [
            '[버스대절 주식회사 - 예약 취소 안내]',
            '',
            '#{기사명} 기사님,',
            '아래 주문이 고객 요청으로 취소되었습니다.',
            '',
            '■ 취소된 운행',
            '- 출발지 : #{출발지}',
            '- 도착지 : #{도착지}',
            '- 출발 : #{출발일시}',
            '- 귀환 : #{귀환일시}',
            '- 차량 : #{차량정보}',
            '- 운행형태 : #{운행형태}',
            '- 인원 : #{인원}명',
            '',
            '이미 결제된 수수료 또는 정산금이 있는 경우 취소 규정에 따라 처리됩니다.',
            '',
            '자세한 내용은 주문내역에서 확인해 주세요.',
        ].join('\n'),
        fallbackSubject: '버스대절 예약 취소 안내',
        fallbackText:
            '[버스대절] #{기사명} 기사님, 여정(#{출발지}→#{도착지}, #{출발일시})이 고객 요청으로 취소되었습니다. 앱에서 확인하세요.',
        button: {
            name: '취소내역 확인',
            linkMo: DRIVER_DASHBOARD_URL,
            linkPc: DRIVER_DASHBOARD_URL,
        },
    },
    REFUND_COMPLETED: {
        tplCode: 'UL_9750',
        body: [
            '[버스대절 주식회사 - 환불 완료]',
            '',
            '안녕하세요. #{기사명} 기사님.',
            '',
            '취소된 주문에 대한 수수료 환불 처리가 완료되었습니다.',
            '',
            '■ 환불 내역',
            '- 환불 금액 : #{환불금액}',
            '- 취소 사유 : #{취소사유}',
            '',
            '■ 취소된 운행',
            '- 출발지 : #{출발지}',
            '- 도착지 : #{도착지}',
            '- 출발 : #{출발일시}',
            '- 귀환 : #{귀환일시}',
            '- 차량 : #{차량정보}',
            '',
            '카드 결제의 경우 카드사 사정에 따라 실제 환불 반영까지 일정 기간이 소요될 수 있습니다.',
        ].join('\n'),
        fallbackSubject: '버스대절 환불 완료 안내',
        fallbackText:
            '[버스대절] #{기사명} 기사님, 취소된 주문(#{출발지}→#{도착지})의 수수료 환불(#{환불금액})이 완료되었습니다.',
        button: {
            name: '예약내역 확인',
            linkMo: DRIVER_DASHBOARD_URL,
            linkPc: DRIVER_DASHBOARD_URL,
        },
    },
    DOCUMENT_APPROVED: {
        tplCode: 'UL_9752',
        body: [
            '[버스대절 주식회사 - 서류 심사 완료]',
            '',
            '안녕하세요. #{기사명} 님.',
            '',
            '제출해주신 #{서류종류} 심사가 승인되었습니다.',
            '이제부터 여정 입찰에 참여하실 수 있습니다.',
            '',
            '■ 승인 정보',
            '- 심사 항목 : #{서류종류}',
            '- 승인일 : #{승인일시}',
            '',
            '버스대절과 함께해 주셔서 감사합니다.',
        ].join('\n'),
        fallbackSubject: '버스대절 서류 심사 승인',
        fallbackText:
            '[버스대절] #{기사명} 님, 제출하신 #{서류종류} 심사가 승인되었습니다. 이제 여정 입찰에 참여하실 수 있습니다.',
        button: {
            name: '입찰 참여하기',
            linkMo: DRIVER_DASHBOARD_URL,
            linkPc: DRIVER_DASHBOARD_URL,
        },
    },
    DOCUMENT_REJECTED: {
        tplCode: 'UL_9754',
        body: [
            '[버스대절 주식회사 - 서류 심사 안내]',
            '',
            '안녕하세요. #{기사명} 님.',
            '',
            '제출해주신 #{서류종류} 심사 결과, 아쉽게도 반려되었습니다.',
            '',
            '■ 반려 사유',
            '#{반려사유}',
            '',
            '사유를 확인하신 후 서류를 다시 제출해 주세요.',
        ].join('\n'),
        fallbackSubject: '버스대절 서류 심사 반려',
        fallbackText:
            '[버스대절] #{기사명} 님, 제출하신 #{서류종류} 심사가 반려되었습니다. 사유: #{반려사유}. 앱에서 다시 제출해 주세요.',
        button: {
            name: '서류 다시 제출하기',
            linkMo: DRIVER_DASHBOARD_URL,
            linkPc: DRIVER_DASHBOARD_URL,
        },
    },
    RECURRING_PAYMENT_FAILED: {
        tplCode: 'UL_9793',
        body: [
            '[버스대절 주식회사 - 결제 안내]',
            '',
            '안녕하세요. #{기사명} 님.',
            '',
            '등록하신 카드로 #{결제항목} 정기결제를 시도했으나 결제에 실패했습니다.',
            '',
            '■ 결제 정보',
            '- 결제 항목 : #{결제항목}',
            '- 결제 금액 : #{결제금액}',
            '- 실패일 : #{실패일시}',
            '',
            '카드 정보를 확인하시고 다시 등록해 주세요. 결제가 계속 실패할 경우 서비스 이용이 제한될 수 있습니다.',
        ].join('\n'),
        fallbackSubject: '버스대절 정기결제 실패 안내',
        fallbackText:
            '[버스대절] #{기사명} 님, #{결제항목} 정기결제(#{결제금액})가 실패했습니다. 카드 정보를 확인해 주세요.',
        button: {
            name: '결제카드 확인하기',
            linkMo: DRIVER_DASHBOARD_URL,
            linkPc: DRIVER_DASHBOARD_URL,
        },
    },
    MEMBERSHIP_PAYMENT_COMPLETED: {
        tplCode: 'UL_9795',
        body: [
            '[버스대절 주식회사 - 결제 완료]',
            '',
            '안녕하세요. #{기사명} 님.',
            '',
            '#{결제항목} 정기결제가 정상적으로 완료되었습니다.',
            '',
            '■ 결제 정보',
            '- 결제 항목 : #{결제항목}',
            '- 결제 금액 : #{결제금액}',
            '- 결제일 : #{결제일시}',
            '- 다음 결제 예정일 : #{다음결제일}',
        ].join('\n'),
        fallbackSubject: '버스대절 결제 완료 안내',
        fallbackText:
            '[버스대절] #{기사명} 님, #{결제항목} 정기결제(#{결제금액})가 완료되었습니다. 다음 결제일은 #{다음결제일}입니다.',
        button: {
            name: '결제 내역 확인하기',
            linkMo: DRIVER_DASHBOARD_URL,
            linkPc: DRIVER_DASHBOARD_URL,
        },
    },
    CARD_CHANGED: {
        tplCode: 'UL_9796',
        body: [
            '[버스대절 주식회사 - 보안 안내]',
            '',
            '안녕하세요. #{기사명} 님.',
            '',
            '결제카드가 #{변경유형}되었습니다.',
            '',
            '■ 카드 정보',
            '- 카드사 : #{카드사}',
            '- 카드번호 : #{카드번호뒤4자리}',
            '- 처리 시각 : #{처리일시}',
            '',
            '본인이 요청하지 않은 변경이라면 즉시 고객센터로 문의해 주세요.',
        ].join('\n'),
        fallbackSubject: '버스대절 결제카드 변경 안내',
        fallbackText:
            '[버스대절] #{기사명} 님, 결제카드가 #{변경유형}되었습니다(#{카드사} #{카드번호뒤4자리}). 본인이 아니라면 고객센터로 문의해 주세요.',
        button: {
            name: '결제카드 확인하기',
            linkMo: DRIVER_DASHBOARD_URL,
            linkPc: DRIVER_DASHBOARD_URL,
        },
    },
} satisfies Record<string, AlimtalkTemplate>;

export const BUS_SIZE_LABELS: Record<string, string> = {
    small: '소형버스',
    medium: '중형버스',
    large: '대형버스',
};

export type AlimtalkTemplateKey = keyof typeof ALIMTALK_TEMPLATES;

const VARIABLE_PATTERN = /#\{([^}]+)\}/g;

export class AlimtalkRenderError extends Error {}

export function renderAlimtalkText(
    text: string,
    variables: Record<string, string>,
): string {
    const missing = new Set<string>();
    const rendered = text.replace(VARIABLE_PATTERN, (_, name: string) => {
        const value = variables[name];
        if (value === undefined) {
            missing.add(name);
            return '';
        }
        return value;
    });
    if (missing.size > 0) {
        throw new AlimtalkRenderError(
            `missing variables: ${[...missing].join(', ')}`,
        );
    }
    return rendered;
}

export function getAlimtalkTemplate(key: AlimtalkTemplateKey): AlimtalkTemplate {
    return ALIMTALK_TEMPLATES[key];
}

export function isAlimtalkTemplateEnabled(key: AlimtalkTemplateKey): boolean {
    if (process.env.ALIMTALK_DISABLED === 'true') {
        return false;
    }
    const enabled = (process.env.ALIMTALK_ENABLED_TEMPLATES || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    return enabled.includes(key);
}
