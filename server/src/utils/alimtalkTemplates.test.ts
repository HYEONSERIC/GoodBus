import { afterEach, describe, expect, it } from 'vitest';
import {
    ALIMTALK_TEMPLATES,
    isAlimtalkTemplateEnabled,
    renderAlimtalkText,
} from './alimtalkTemplates';

// Aligo에 실제 등록·승인된 본문과 동일해야 한다. 템플릿 본문을 바꾸면 재심사가 필요하므로
// 이 기대값도 등록본이 바뀔 때만 함께 수정한다.
const REGISTERED_BID_ARRIVED = [
    '[버스대절 주식회사]',
    '',
    '홍길동님, 등록하신 여정에 새 입찰이 도착했습니다.',
    '',
    '■ 여정 정보',
    '- 출발지 : 서울',
    '- 도착지 : 부산',
    '- 출발 : 2026-10-10 09:00',
    '',
    '■ 입찰 정보',
    '- 입찰 금액 : 150만원',
    '- 입찰자 : 김기사',
    '',
    '받으신 입찰을 확인하고 비교해 보세요.',
    '',
    '※ 본 메시지는 고객님께서 입찰 알림 수신에 동의하신 여정에 한해, 새 입찰이 등록될 때마다 발송됩니다.',
].join('\n');

const REGISTERED_BID_MILESTONE = [
    '[버스대절 주식회사]',
    '',
    '홍길동님의 여정에 입찰이',
    '총 5건 등록되었습니다.',
    '',
    '여정 정보 보기 버튼으로',
    '전체 입찰 내역을 확인하세요.',
    '',
    '※ 본 메시지는 고객님께서 입찰 알림 수신에 동의하신 여정에 한해, 입찰 건수 알림은 최대 10건까지만 발송됩니다.',
].join('\n');

describe('renderAlimtalkText', () => {
    it('치환 후 #{ 가 남지 않는다', () => {
        expect(renderAlimtalkText('안녕 #{a}, #{b}', { a: 'X', b: 'Y' })).toBe(
            '안녕 X, Y',
        );
    });

    it('변수가 빠지면 발송 전에 던진다', () => {
        expect(() => renderAlimtalkText('#{a} #{b}', { a: 'X' })).toThrow(
            /missing variables: b/,
        );
    });
});

describe('ALIMTALK_TEMPLATES 등록본 일치', () => {
    it('회원가입안내(WELCOME) 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(ALIMTALK_TEMPLATES.WELCOME.body, {
            고객명: '홍길동',
        });
        expect(rendered).toBe(
            [
                '[버스대절 주식회사]',
                '',
                '홍길동님, 버스대절 회원가입을 환영합니다.',
                '',
                '여정 견적과 입찰 내역을 한곳에서 편하게 확인하실 수 있습니다.',
                '',
                "※ 견적등록 알림을 받고 싶지 않으시면 로그인 후 알림 설정에서 '견적등록 알림'을 꺼주세요.",
            ].join('\n'),
        );
    });

    it('승객_입찰도착 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(ALIMTALK_TEMPLATES.BID_ARRIVED.body, {
            고객명: '홍길동',
            출발지: '서울',
            도착지: '부산',
            출발일시: '2026-10-10 09:00',
            입찰금액: '150만원',
            입찰자명: '김기사',
        });
        expect(rendered).toBe(REGISTERED_BID_ARRIVED);
    });

    it('승객_입찰마일스톤 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(
            ALIMTALK_TEMPLATES.BID_MILESTONE.body,
            { 고객명: '홍길동', 입찰건수: '5' },
        );
        expect(rendered).toBe(REGISTERED_BID_MILESTONE);
    });

    it('대체문자 본문도 모든 변수가 채워진다', () => {
        const arrived = renderAlimtalkText(ALIMTALK_TEMPLATES.BID_ARRIVED.fallbackText, {
            고객명: '홍길동',
            출발지: '서울',
            도착지: '부산',
            입찰금액: '150만원',
            입찰자명: '김기사',
        });
        expect(arrived).not.toContain('#{');
        const milestone = renderAlimtalkText(
            ALIMTALK_TEMPLATES.BID_MILESTONE.fallbackText,
            { 고객명: '홍길동', 입찰건수: '10' },
        );
        expect(milestone).not.toContain('#{');
    });
});

describe('isAlimtalkTemplateEnabled', () => {
    const saved = { ...process.env };

    afterEach(() => {
        process.env = { ...saved };
    });

    it('ALIMTALK_ENABLED_TEMPLATES 목록에 있는 템플릿만 켜진다', () => {
        process.env.ALIMTALK_ENABLED_TEMPLATES = 'BID_ARRIVED, BID_MILESTONE';
        delete process.env.ALIMTALK_DISABLED;
        expect(isAlimtalkTemplateEnabled('BID_ARRIVED')).toBe(true);
        expect(isAlimtalkTemplateEnabled('BID_MILESTONE')).toBe(true);
    });

    it('목록이 없으면 전부 꺼진다', () => {
        delete process.env.ALIMTALK_ENABLED_TEMPLATES;
        delete process.env.ALIMTALK_DISABLED;
        expect(isAlimtalkTemplateEnabled('BID_ARRIVED')).toBe(false);
    });

    it('ALIMTALK_DISABLED=true면 목록과 무관하게 전부 꺼진다', () => {
        process.env.ALIMTALK_ENABLED_TEMPLATES = 'BID_ARRIVED';
        process.env.ALIMTALK_DISABLED = 'true';
        expect(isAlimtalkTemplateEnabled('BID_ARRIVED')).toBe(false);
    });
});
