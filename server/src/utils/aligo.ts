const ALIGO_SMS_URL = 'https://apis.aligo.in/send/';
const ALIGO_ALIMTALK_URL = 'https://kakaoapi.aligo.in/akv10/alimtalk/send/';

type SendOtpResult =
    | { ok: true; devMode: boolean; channel: 'alimtalk' | 'sms' | 'dev' }
    | { ok: false; error: string };

function buildSmsMessage(code: string): string {
    return `[GoodBus] 인증번호는 ${code} 입니다. 5분 내에 입력해주세요.`;
}

async function sendViaSms(
    phoneNumber: string,
    code: string,
    config: { apiKey: string; userId: string; sender: string }
): Promise<SendOtpResult> {
    try {
        const response = await fetch(ALIGO_SMS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                key: config.apiKey,
                user_id: config.userId,
                sender: config.sender,
                receiver: phoneNumber,
                msg: buildSmsMessage(code),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Aligo SMS error:', response.status, errorText);
            return { ok: false, error: errorText || 'Aligo API error' };
        }

        const data: any = await response.json();
        if (String(data?.result_code) !== '1') {
            console.error('Aligo SMS rejected:', data);
            return {
                ok: false,
                error: String(data?.message || 'Aligo rejected the request'),
            };
        }

        return { ok: true, devMode: false, channel: 'sms' };
    } catch (error) {
        console.error('Aligo SMS request failed:', error);
        return { ok: false, error: 'Aligo request failed' };
    }
}

// Kakao AlimTalk with `failover=Y`: Aligo auto-falls-back to SMS (using
// fsubject_1/fmessage_1) when the recipient can't receive AlimTalk (no
// KakaoTalk, blocked the channel, etc.) — no separate fallback call needed
// on our side. Params per .claude/roadmap.md's Aligo research (2026-08-07);
// re-check against Aligo's own integration guide once the Kakao business
// channel + template are actually approved, since this couldn't be
// re-verified against live docs (the AlimTalk spec page was unreachable).
async function sendViaAlimtalk(
    phoneNumber: string,
    code: string,
    config: {
        apiKey: string;
        userId: string;
        sender: string;
        senderKey: string;
        tplCode: string;
        template: string;
    }
): Promise<SendOtpResult> {
    // message_1 must match the Kakao-approved template text exactly, with
    // only the variable portion substituted.
    const message = config.template.replace(/\{\{CODE\}\}/g, code);

    try {
        const response = await fetch(ALIGO_ALIMTALK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                apikey: config.apiKey,
                userid: config.userId,
                senderkey: config.senderKey,
                tpl_code: config.tplCode,
                sender: config.sender,
                receiver_1: phoneNumber,
                message_1: message,
                failover: 'Y',
                fsubject_1: 'GoodBus 인증번호',
                fmessage_1: buildSmsMessage(code),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Aligo AlimTalk error:', response.status, errorText);
            return { ok: false, error: errorText || 'Aligo AlimTalk API error' };
        }

        const data: any = await response.json();
        if (String(data?.result_code) !== '1') {
            console.error('Aligo AlimTalk rejected:', data);
            return {
                ok: false,
                error: String(
                    data?.message || 'Aligo AlimTalk rejected the request'
                ),
            };
        }

        return { ok: true, devMode: false, channel: 'alimtalk' };
    } catch (error) {
        console.error('Aligo AlimTalk request failed:', error);
        return { ok: false, error: 'Aligo AlimTalk request failed' };
    }
}

// Channel is picked by which env vars are present:
//   - none of ALIGO_API_KEY/ALIGO_USER_ID/ALIGO_SENDER -> dev mode (console log)
//   - + ALIGO_KAKAO_SENDERKEY/ALIGO_ALIMTALK_TPL_CODE/ALIGO_ALIMTALK_TEMPLATE -> AlimTalk (with SMS failover)
//   - otherwise -> plain SMS
// So going from dev mode -> SMS-only -> AlimTalk+SMS-failover is just adding
// env vars, no code changes.
export async function sendOtpSms(
    phoneNumber: string,
    code: string
): Promise<SendOtpResult> {
    const apiKey = process.env.ALIGO_API_KEY;
    const userId = process.env.ALIGO_USER_ID;
    const sender = process.env.ALIGO_SENDER;

    if (!apiKey || !userId || !sender) {
        console.log(`[Aligo:DEV] ${phoneNumber} 인증번호: ${code}`);
        return { ok: true, devMode: true, channel: 'dev' };
    }

    const senderKey = process.env.ALIGO_KAKAO_SENDERKEY;
    const tplCode = process.env.ALIGO_ALIMTALK_TPL_CODE;
    const template = process.env.ALIGO_ALIMTALK_TEMPLATE;

    if (senderKey && tplCode && template) {
        return sendViaAlimtalk(phoneNumber, code, {
            apiKey,
            userId,
            sender,
            senderKey,
            tplCode,
            template,
        });
    }

    return sendViaSms(phoneNumber, code, { apiKey, userId, sender });
}
