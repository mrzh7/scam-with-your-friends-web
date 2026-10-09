export type Scheme = 'identity' | 'credit' | 'remote' | 'gift' | 'charity' | 'crypto' | 'prize' | 'retirement';
export const SCHEMES: Record<Scheme, { title: string; name: string; payout: number; day: number; code: string; description: string }> = {
  identity: { title: 'Identity', name: '身份档案', payout: 250, day: 1, code: 'ID', description: '取得来电者的虚构档案编号，在 Identity 中完成验证。' },
  credit: { title: 'Credit Card', name: '三重卡片验证', payout: 400, day: 1, code: 'CARD', description: '依次核对游戏卡号、安全口令与到期标记。完成全部三项后结算。' },
  remote: { title: 'AnyViewer', name: '远程桌面', payout: 400, day: 2, code: 'PC', description: '连接模拟电脑，找出正确的任务文件。' },
  gift: { title: 'Gift Cards', name: '礼品卡乌龙', payout: 350, day: 2, code: 'GC', description: '从对话中取得游戏礼品券，完成兑换。' },
  charity: { title: 'Charity', name: '月球猫咪基金', payout: 500, day: 3, code: 'CAT', description: '让来电者支持荒唐的月球流浪猫计划。' },
  crypto: { title: 'Corn Futures', name: '玉米期货', payout: 650, day: 4, code: 'CORN', description: '为星际爆米花公司寻找一位投资者。' },
  prize: { title: 'Nobel Prize', name: '年度摸鱼大奖', payout: 800, day: 5, code: 'WIN', description: '说服来电者参加宇宙级摸鱼颁奖礼。' },
  retirement: { title: 'Retirement Fund', name: '火星退休计划', payout: 1000, day: 6, code: 'MARS', description: '帮助宇航员预订根本不存在的火星海景房。' },
};
export const DAYS = [
  { name: '第一天，别被开除', subtitle: 'WELCOME TO THE FAMILY', quota: 600, seconds: 360, brief: '接听电话、建立信任、拿到任务编号。老板只关心右下角的数字。', event: null },
  { name: '请勿点击可疑链接', subtitle: 'REMOTE POSSIBILITIES', quota: 1100, seconds: 360, brief: 'AnyViewer 与礼品卡业务已开放。有些来电者比你想得更聪明。', event: 'virus' },
  { name: '一点小小的办公室事故', subtitle: 'BUSINESS AS UNUSUAL', quota: 1750, seconds: 360, brief: '月球猫咪基金上线。准备好维修包，今天的供电不太正常。', event: 'power' },
  { name: '玉米比特币', subtitle: 'THE MARKET NEVER SLEEPS', quota: 2200, seconds: 360, brief: '玉米期货开盘。备好灭火器，办公室电器正在超负荷运转。', event: 'fire' },
  { name: '年度员工（暂定）', subtitle: 'EMPLOYEE OF THE MOMENT', quota: 2600, seconds: 360, brief: '你的年度摸鱼大奖提名已通过。先确保自己能活到颁奖。', event: 'raid' },
  { name: '最后一班火星列车', subtitle: 'RETIREMENT IS A STATE OF MIND', quota: 3200, seconds: 360, brief: '退休计划开放。别问火星为什么有海。老板也不知道。', event: 'power' },
  { name: '周末？这里没有周末', subtitle: 'THE FINAL PERFORMANCE REVIEW', quota: 4000, seconds: 420, brief: '完成最后一轮考核，拿到本周优秀员工奖。办公室已进入极限模式。', event: 'raid' },
] as const;
export type Tone = 'warm' | 'confident' | 'playful';
export const CALLERS: { name: string; role: string; color: string; hair: string; style: number; tone: Tone; intro: string; good: string[]; bad: string; bait?: boolean }[] = [
  { name: 'Dorothy Mayfield', role: '退休教师 · 喜欢耐心的人', color: '#cda6cd', hair: '#d8d4ce', style: 0, tone: 'warm', intro: '喂？亲爱的，我的电脑一直在说它想休假。这正常吗？', good: ['你这么有耐心，像我的外孙。他也总在对着电脑说话。', '好吧，我找到那张写着游戏编号的纸了。你等我戴上眼镜。', '找到了！不过你要答应我，让这台电脑准时下班。'], bad: '慢一点，亲爱的！你说的比我的猫还让人困惑。' },
  { name: 'Miles “Orbit” Vega', role: '宇航员 · 需要明确指令', color: '#91bbce', hair: '#49312c', style: 1, tone: 'confident', intro: '地面控制中心？我的飞船电脑正在自动播放电梯音乐。', good: ['收到。你的说明听起来比我们的飞行手册靠谱。', '正在打开任务终端。请保持通讯，地球人。', '授权代码已准备好。愿咖啡与你同在。'], bad: '这不是标准流程。请给我一个确切的方案。' },
  { name: 'Shanice “Dee” Bishop', role: '脱口秀演员 · 喜欢荒唐笑话', color: '#e6b466', hair: '#332427', style: 2, tone: 'playful', intro: '我刚买的智能冰箱在嘲笑我的晚餐。你能管管它吗？', good: ['哈！好吧，这个笑话比冰箱讲得好。', '行，你有资格加入我的冰箱喜剧俱乐部。', '这是我的任务编号。请你务必让它学会闭嘴。'], bad: '太正式了吧？你听起来像我的洗衣机客服。' },
  { name: 'Franklin D. Hyper', role: '前会计师 · 重视细节', color: '#84bea0', hair: '#a5a391', style: 3, tone: 'confident', intro: '我的虚拟账本多了三百吨玉米。请给我一个解释。', good: ['流程清楚，数字准确。我喜欢这种工作态度。', '我正在检查账本第三页，右下角有一个编号。', '我记下了这次服务。希望你的老板能给你发奖金。'], bad: '不要绕弯子。我只想知道下一步是什么。' },
  { name: 'Brittany “Lexi” Summers', role: '内容创作者 · 拒绝无聊', color: '#df91a5', hair: '#ecbb60', style: 4, tone: 'playful', intro: '快一点，我正在直播。我的虚拟宠物把我的账号吃掉了。', good: ['这个可以剪成短视频！你比上个客服有趣。', '好吧，我先让直播间安静两分钟。', '编号在这里。记得给我的宠物五星好评。'], bad: '天呐，好无聊。我开始想挂电话了。' },
  { name: 'Eleanor “Granny” Grimshire', role: '园艺爱好者 · 喜欢被倾听', color: '#c7b07d', hair: '#eeeeea', style: 5, tone: 'warm', intro: '年轻人，我的花园小精灵说我中了一个大奖。', good: ['好孩子，先喝口水。你的声音听起来很忙。', '小精灵说你还算可靠。我去拿那张小纸条。', '给你编号。下次来花园，带点饼干。'], bad: '你跟那个吵闹的小精灵一样没耐心。' },
  { name: 'Damien Holloway', role: '神秘程序员 · 来意不明', color: '#8993ad', hair: '#29272f', style: 6, tone: 'confident', bait: true, intro: '嘿，我可以帮你远程升级电脑。只要点开我发来的文件。', good: ['你很谨慎。我尊重谨慎的人。', '好吧，我们按你说的流程来。', '测试结束。你通过了。这个编号就当小费吧。'], bad: '别问那么多，点开那个附件就行。相信我。' },
  { name: 'Oliver Pickles', role: '宠物店老板 · 热心肠', color: '#b2cc8c', hair: '#9b633f', style: 7, tone: 'warm', intro: '有一只鹦鹉用我的电脑订了去月球的机票！', good: ['谢谢你愿意帮忙。那只鹦鹉还在旁边说风凉话。', '我把虚构订单打开了，上面有个彩色编号。', '就这些了。鹦鹉说它给你五星。'], bad: '别对我的鹦鹉发脾气，它会学你的话。' },
];
export interface ShopItem { id: string; name: string; english: string; price: number; icon: string; category: string; description: string; delivery?: boolean; repeatable?: boolean }
export const SHOP: ShopItem[] = [
  { id: 'headset', delivery: true, name: '降噪耳机', english: 'Definitely Professional™', price: 200, icon: 'headphones', category: 'business', description: '每次接听增加 10 点初始信任。隔绝老板，拥抱业绩。' },
  { id: 'antivirus', name: 'Malwarebits Pro', english: 'Your questionable guardian', price: 350, icon: 'shield', category: 'software', description: '自动拦截病毒事件，省下宝贵的上班时间。' },
  { id: 'coffee', delivery: true, name: '永动咖啡机', english: 'Sleep is a suggestion', price: 450, icon: 'coffee', category: 'goods', description: '每次通话额外获得 30 秒耐心。今天不打瞌睡。' },
  { id: 'script', name: '黄金话术本', english: '100% more convincing', price: 600, icon: 'script', category: 'business', description: '合适的应答额外获得 5 点信任。' },
  { id: 'bonus', name: '绩效放大器', english: 'Numbers go brrrr', price: 900, icon: 'chart', category: 'software', description: '所有任务的收入增加 20%。老板看了都说好。' },
  { id: 'plant', delivery: true, name: '情绪支持绿植', english: 'Employee of the month', price: 120, icon: 'plant', category: 'goods', description: '安装后降低 15 点风险，每次完成任务再降低 2 点。它是最安静的同事。' },
  { id: 'shield', delivery: true, repeatable: true, name: '客户支持防暴盾', english: 'Customer Support Riot Shield', price: 120, icon: 'shield', category: 'goods', description: '领取后装备，挡住下一次突袭后消耗。' },
  { id: 'airstrike', delivery: true, repeatable: true, name: '向自己发射彩纸空袭', english: 'Airstrike Yourselves', price: 6000, icon: 'rocket', category: 'goods', description: '领取后使用，附近道具被冲击弹飞、同事短暂踉跄。一次性道具。' },
];

export const ACHIEVEMENTS = [
 { id: 'first', name: '第一桶金', description: '完成第一笔业务。' },
 { id: 'streak', name: '三连成交', description: '连续完成三笔业务。' },
 { id: 'buyer', name: '办公室投资人', description: '购买第一件商品。' },
 { id: 'fixer', name: '救火队员', description: '成功排除一次故障。' },
 { id: 'survivor', name: '周末幸存者', description: '通过第七天最终考核。' },
];
SHOP.push(
 { id: 'energy', name: '能量饮料', english: 'One more call', price: 60, icon: 'coffee', category: 'goods', delivery: true, repeatable: true, description: '恢复体力，当前来电额外获得 25 秒耐心。一次性消耗。' },
 { id: 'repair', name: '配电维修包', english: 'Power to the people', price: 90, icon: 'zap', category: 'goods', delivery: true, repeatable: true, description: '在茶水间配电箱旁使用，立即修复停电。也可徒手分三次重置。' },
 { id: 'extinguisher', name: '灭火器', english: 'Definitely not coffee', price: 180, icon: 'shield', category: 'goods', delivery: true, repeatable: true, description: '发生火灾时使用，立即扑灭火情。一次性补充瓶。' },
 { id: 'ball', name: '办公室篮球', english: 'Team building, literally', price: 45, icon: 'cookie', category: 'goods', delivery: true, repeatable: true, description: '生成一只可拾取、抛掷、反弹的篮球。物理状态对全体同事同步。' }
);
