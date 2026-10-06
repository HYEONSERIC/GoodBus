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

export const ALIMTALK_TEMPLATES = {
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
} satisfies Record<string, AlimtalkTemplate>;

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
