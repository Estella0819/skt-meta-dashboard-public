(function attachCreativeDecision(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardCreativeDecision = api;
})(typeof window !== "undefined" ? window : globalThis, function createCreativeDecision() {
  const additiveFields = [
    "spend",
    "purchase_value",
    "purchase_times",
    "impressions",
    "clicks",
    "inline_link_clicks",
    "outbound_clicks",
  ];

  function validMaterialCode(value) {
    const code = String(value ?? "").trim();
    return code && code !== "Unknown" && code !== "-" ? code : "";
  }

  function explicitAnalysisMaterialCode(value) {
    const code = validMaterialCode(value);
    return /^(?:SC|JJ)[A-Za-z0-9]+$/i.test(code) ? code : "";
  }

  function normalizeName(value) {
    return String(value ?? "")
      .trim()
      .replace(/[\s_\-–—]*(?:广告副本|copy)(?:[\s_\-]*\d+)?\s*$/i, "")
      .replace(/[\s_]+/g, " ")
      .trim()
      .toLowerCase();
  }

  function creativeIdentity(row = {}) {
    const code = validMaterialCode(row.material_code);
    if (code) return { id: code, key: `code:${code}`, source: "material_code" };
    const name = normalizeName(row.material_name || row.ad_name);
    if (name) return { id: name, key: `name:${name}`, source: "normalized_name" };
    const adId = String(row.ad_id ?? "").trim() || "unknown";
    return { id: adId, key: `ad:${adId}`, source: "ad_id" };
  }

  function productName(row = {}) {
    // These fields belong to the Meta performance row. DMS asset product names
    // are intentionally kept outside this function and never affect analysis.
    return String(row.meta_standard_product_name || row.standard_product_name || row.product_name || "未识别产品");
  }

  const sellingPointRules = [
    { key: "brightening_spot", type: "efficacy_benefit", definition: "以提亮、淡斑、改善暗沉或均匀肤色作为画面核心结果", boundary: "套组步骤中顺带出现提亮，不足以单独判为主卖点", pattern: /提亮|美白|亮白|淡化(?:暗斑|色斑|痘印)|暗斑|色斑|痘印|暗沉|肤色不匀|均匀肤色|bright(?:en(?:ing)?|er)|dark spots?|dull skin/i, centralPattern: /美白(?:套组|护理|routine)|提亮(?:套组|护理|routine|日常|结果|进展|改善|效果|对比)|暗沉(?:急救|改善)|淡斑|色斑问题|dull skin|dark spots?|bright(?:en(?:ing)?|er)/i },
    { key: "hydration_plumping", type: "efficacy_benefit", definition: "以补水、保湿、锁水或饱满充盈作为核心结果", boundary: "Routine 中的保湿步骤只记为辅助卖点", pattern: /补水|保湿|水润|锁水|饱满|充盈|干燥|缺水|hydrat(?:e|ing|ion)|plump/i, centralPattern: /(?:补水|保湿|锁水|水润|饱满|充盈)(?:护理|急救|结果|改善|进展|效果|对比)|干燥(?:急救|改善)|hydration|plump/i },
    { key: "barrier_soothing", type: "efficacy_benefit", definition: "以屏障修护、舒缓泛红、敏感或受损状态恢复为核心结果", boundary: "赠品面霜或夜间步骤中的修护描述只记为辅助卖点", pattern: /屏障|修护|修复|舒缓|泛红|镇静|晒后|敏感|受损|barrier|sooth|redness|post[- ]sun/i, centralPattern: /屏障(?:修护|受损)|修护(?:屏障|护理|急救|结果|改善|效果)|泛红(?:急救|改善)|晒后(?:急救|修护|重置)|post[- ]sun|barrier repair/i },
    { key: "acne_oil_pore", type: "efficacy_benefit", definition: "以痘痘、粉刺、黑头、毛孔或控油为核心问题", boundary: "按肤质选择中仅列出痘肌，不代表整条素材主卖点", pattern: /痘痘|痘肌|爆痘|粉刺|黑头|毛孔|控油|油脂|出油|堵塞|acne|breakout|pores?|oil control/i, centralPattern: /痘痘(?:问题|护理)|痘肌(?:护理|方案)|粉刺|黑头|毛孔(?:护理|改善|效果|对比)|控油(?:护理|结果|改善|效果)|acne|breakout/i },
    { key: "sun_protection", type: "efficacy_benefit", definition: "以 SPF、UVA/UVB 或紫外线防护作为核心购买理由", boundary: "日间 Routine 或跨品类陈列中的防晒单品只记为辅助卖点", pattern: /防晒|spf\s*\d*|uva|uvb|紫外线|sun protection|sunscreen/i, centralPattern: /防晒(?:卖点|功效|对比|选择|测试)|spf\s*\d+|uva|uvb|sun protection|sunscreen/i },
    { key: "coverage_even_tone", type: "efficacy_benefit", definition: "以遮瑕、肤色修饰或均匀妆效作为核心结果", boundary: "护肤素材中的均匀肤色归提亮，不归底妆遮瑕", pattern: /遮瑕|遮盖|遮住|均匀妆效|修饰肤色|肤色修饰|coverage|cover/i, centralPattern: /遮瑕(?:效果|对比|测试)|遮盖(?:效果|力|需求|程度|级别)|(?:轻度|中度|高度)遮盖|均匀妆效|coverage/i },
    { key: "longwear_finish", type: "efficacy_benefit", definition: "以持妆、防脱、耐汗防水、哑光或雾面妆效为核心结果", boundary: "妆效合集里仅出现一个哑光选项时不判为整条素材主卖点", pattern: /持妆|长效持久|不脱妆|防脱|耐汗|防水|哑光|雾面|longwear|matte/i, centralPattern: /持妆(?:一整天|效果|测试)|不脱妆|防脱|耐汗|防水|哑光(?:妆|效果)|雾面(?:妆|效果)|longwear|matte/i },
    { key: "glow_radiance", type: "efficacy_benefit", definition: "以水光、透亮、光泽或发光肌妆效/肤感为核心结果", boundary: "跨品类陈列中某个单品的光泽描述只记为辅助卖点", pattern: /水光|光泽|透亮|亮泽|发光|玻璃肌|奶油肌|光感|glow|radiance|glass skin/i, centralPattern: /水光(?:肌|妆|效果)|光泽(?:肌|妆|效果|结果)|发光肌|玻璃肌|glow(?:ing)?(?: skin| routine| ritual| essentials| result)?|radiance|glass skin/i },
    { key: "smoothing_exfoliation", type: "efficacy_benefit", definition: "以平滑粗糙、去角质或焕肤为核心结果", boundary: "多步骤护理中的平滑描述只记为辅助卖点", pattern: /平滑|去角质|焕肤|粗糙|磨皮|细腻|柔滑|exfoliat|smooth/i, centralPattern: /去角质|焕肤(?:护理|结果)|粗糙(?:改善|急救)|平滑(?:肌肤|结果)|exfoliat|smooth/i },
    { key: "lip_plump_care", type: "efficacy_benefit", definition: "以唇部丰盈、淡化唇纹或润唇护理为核心结果", boundary: "跨品类组合中的唇部单品只记为辅助卖点；泛指肌肤丰盈不归入唇部卖点", pattern: /(?:唇部?|嘴唇)(?:丰盈|护理|饱满)|丰唇|唇纹|润唇|嘟嘟唇|上唇效果|lip plump|lip care/i, centralPattern: /(?:唇部?|嘴唇)(?:丰盈|护理|饱满)|丰唇|唇纹|润唇|嘟嘟唇|lip plump|lip care/i },
    { key: "firming_antiaging", type: "efficacy_benefit", definition: "以紧致、抗老、细纹皱纹或弹性改善为核心结果", boundary: "成分说明中顺带提到抗老时只记为辅助卖点", pattern: /紧致|抗老|抗衰|细纹|皱纹|弹性|firming|anti[- ]aging|wrinkle/i, centralPattern: /紧致(?:护理|效果)|抗老|抗衰|细纹(?:改善|淡化)|皱纹(?:改善|淡化)|firming|anti[- ]aging|wrinkle/i },
    { key: "deep_cleansing", type: "efficacy_benefit", definition: "以深层清洁、清洁毛孔、吸附油脂或净化作为核心结果", boundary: "套组/Routine 中的洁面步骤绝不单独升级为主卖点", pattern: /深层清洁|清洁毛孔|吸附油脂|净化|洁面|deep clean|clean pores/i, centralPattern: /深层清洁|清洁毛孔|吸附油脂|净化(?:毛孔|肌肤)|deep clean|clean pores/i },
    { key: "pdrn_formula", type: "ingredient_formula", definition: "记录画面是否用 PDRN 解释消费者结果；仅作成分依据，不参与主卖点汇总", boundary: "产品名称或配方清单中出现 PDRN，不自动成为主卖点", pattern: /pdrn|聚脱氧核糖核苷酸/i, centralPattern: /pdrn(?:成分|配方|机制|作用)|聚脱氧核糖核苷酸/i },
    { key: "niacinamide_formula", type: "ingredient_formula", definition: "记录画面是否用烟酰胺解释消费者结果；仅作成分依据，不参与主卖点汇总", boundary: "套组包含烟酰胺产品时不改变消费者结果分类", pattern: /烟酰胺|niacinamide/i, centralPattern: /烟酰胺(?:成分|配方|机制|作用)|niacinamide/i },
    { key: "ceramide_formula", type: "ingredient_formula", definition: "记录画面是否用神经酰胺解释消费者结果；仅作成分依据，不参与主卖点汇总", boundary: "产品清单中出现神经酰胺时不改变消费者结果分类", pattern: /神经酰胺|ceramide/i, centralPattern: /神经酰胺(?:成分|配方|机制|作用)|ceramide/i },
    { key: "vitamin_c_formula", type: "ingredient_formula", definition: "记录画面是否用维 C 解释消费者结果；仅作成分依据，不参与主卖点汇总", boundary: "Routine 中包含维 C 产品时不改变消费者结果分类", pattern: /维生素\s*c|维c|vc精华|vitamin\s*c/i, centralPattern: /维(?:生素\s*)?c(?:成分|配方|机制|作用)|vitamin\s*c/i },
    { key: "retinol_formula", type: "ingredient_formula", definition: "记录画面是否用视黄醇解释消费者结果；仅作成分依据，不参与主卖点汇总", boundary: "早 C 晚 A 流程中出现视黄醇时不改变消费者结果分类", pattern: /视黄醇|retinol|早c晚a/i, centralPattern: /视黄醇(?:成分|配方|机制|作用)|retinol/i },
    { key: "botanical_clay_formula", type: "ingredient_formula", definition: "记录画面是否用植萃或泥膜成分解释消费者结果；仅作成分依据，不参与主卖点汇总", boundary: "组合中包含泥膜产品时不改变消费者结果分类", pattern: /艾草|火山泥|白泥|黏土|clay|积雪草/i, centralPattern: /(?:艾草|火山泥|白泥|黏土|clay|积雪草)(?:成分|配方|机制|作用)/i },
    { key: "lightweight_comfort", type: "texture_experience", definition: "以轻薄、不黏、透气或无负担的使用感作为核心卖点", boundary: "多功效说明中顺带写轻薄时只记为辅助卖点", pattern: /轻薄|不厚重|不黏|不粘|清透|透气|无负担|lightweight/i, centralPattern: /轻薄(?:妆感|质地|体验)|不厚重|不黏|透气|无负担|lightweight/i },
    { key: "texture_absorption", type: "texture_experience", definition: "以质地形态、吸收速度、清爽或丝滑触感作为核心卖点", boundary: "成分/功效素材中的质地描述只记为辅助卖点", pattern: /质地|吸收|清爽|绵密|凝胶|啫喱|丝滑|柔润|texture|absorb/i, centralPattern: /质地(?:展示|对比|体验)|吸收(?:速度|效果)|清爽(?:质地|体验)|texture|absorb/i },
    { key: "quick_easy_use", type: "usage_convenience", definition: "以快速、便携、一步完成或易用作为核心购买理由", boundary: "步骤说明中出现分钟数，不自动判为快速易用", pattern: /快速|分钟完成|便携|随身|易用|一抹|一步|免洗|懒人|quick|easy/i, centralPattern: /快速(?:完成|出门)|便携|随身|易用|一抹|一步完成|免洗|懒人|quick|easy/i },
    { key: "skin_type_fit", type: "audience_fit", definition: "以干皮、油皮、敏感肌等人群/肤质适配作为核心选择依据", boundary: "素材只列出某类肤质问题时不自动判为适用人群", pattern: /干皮|油皮|混合肌|敏感肌|痘肌|按肤质|不同肤质|适合.*肌|skin type/i, centralPattern: /按肤质|不同肤质|适合.*肌|干皮.*油皮|油皮.*干皮|skin type/i },
    { key: "gentle_safety", type: "safety_gentleness", definition: "以温和、低敏、无刺激或不致痘作为核心安全承诺", boundary: "面向敏感肌不等于明确的温和安全主张", pattern: /温和|无刺激|不刺激|低敏|敏感肌可用|不致痘|安全|gentle|hypoallergenic/i, centralPattern: /温和(?:配方|护理)|无刺激|不刺激|低敏|不致痘|安全(?:测试|认证)|gentle|hypoallergenic/i },
  ];

  const sellingPointSpecialDefinitions = [
    { key: "multi_benefit_mix", type: "multi_benefit", definition: "同一素材明确呈现两项或以上消费者卖点，但画面没有一个明显占主导的核心承诺", boundary: "这不是空白标签：必须同时保留素材实际命中的具体卖点；若标题、结果或问题明确聚焦一个卖点，仍归该核心卖点" },
    { key: "unclassified", type: "unclear", definition: "画面证据不足以确认具体卖点，或只有产品陈列/促销信息", boundary: "不根据产品名称、文件名或单个弱关键词强行补卖点" },
  ];

  function sellingPointDefinitions() {
    return [...sellingPointRules, ...sellingPointSpecialDefinitions].map(({ key, type, definition, boundary }) => ({ key, type, definition, boundary }));
  }

  function sellingPointContext(tag = {}, primary = "unclassified", secondary = []) {
    const subtype = String(tag.content_direction_l2 || "");
    const direction = String(tag.content_direction_l1 || "");
    const grouping = String(tag.product_grouping || tag.product_focus || "");
    const isBundle = subtype === "bundle_assortment"
      || ["bundle_or_series", "multi_product_combination", "selection_set", "product_bundle", "multi_product"].includes(grouping);
    const isRoutine = direction === "usage_education"
      || ["routine_overall_result", "step_by_step_routine", "scheduled_routine", "product_pairing_logic", "routine_steps", "multi_step_routine", "am_pm_routine", "periodic_plan"].includes(subtype);
    const isSelection = direction === "comparison"
      || ["by_skin_need", "by_finish", "by_scenario", "benefit_parameter_comparison", "shade_match", "shade_try_on", "shade_matching"].includes(subtype);
    if (primary === "multi_benefit_mix") {
      if (direction === "problem_solution") return "multi_concern_solution";
      if (isRoutine) return "routine_solution";
      if (isSelection) return "guided_selection";
      if (isBundle) return "bundle_value";
      return "multi_benefit_mix";
    }
    if (primary !== "unclassified") return "consumer_result";
    if (subtype === "shade_match") return "shade_selection";
    if (direction === "scenario") return "scenario_message";
    if (isSelection) return "guided_selection";
    if (isRoutine || subtype === "single_product_how_to") return "routine_solution";
    if (isBundle) return "bundle_value";
    if (subtype === "word_of_mouth_proof") return "social_proof_message";
    return secondary.length ? "multi_benefit_mix" : "unresolved_result";
  }

  // A material can be fully analyzed even when it does not make a single
  // consumer-benefit claim. Bundle value, routines, and choice guides are
  // meaningful content claims and should not be counted as missing analysis.
  function hasIdentifiedSellingPointClaim(tag = {}) {
    return (tag.primary_selling_point || "unclassified") !== "unclassified"
      || (tag.selling_point_context || "unresolved_result") !== "unresolved_result";
  }

  function hasExplicitConsumerBenefit(tag = {}) {
    const point = String(tag.primary_selling_point || "").trim();
    return Boolean(point) && point !== "unclassified";
  }

  function sellingPointFromTag(tag = {}, options = {}) {
    const explicitPrimary = String(tag.primary_selling_point || "").trim();
    const explicitType = String(tag.primary_selling_point_type || "").trim();
    const explicitContext = String(tag.selling_point_context || "").trim();
    const explicitSecondary = Array.isArray(tag.secondary_selling_points)
      ? tag.secondary_selling_points.filter(Boolean)
      : [];
    const ingredientKeys = new Set(sellingPointRules
      .filter((rule) => rule.type === "ingredient_formula")
      .map((rule) => rule.key));
    const explicitIngredients = [
      ...(Array.isArray(tag.ingredient_evidence) ? tag.ingredient_evidence : []),
      ...(ingredientKeys.has(explicitPrimary) ? [explicitPrimary] : []),
      ...explicitSecondary.filter((value) => ingredientKeys.has(value)),
    ].filter((value, index, values) => value && values.indexOf(value) === index);
    if (explicitPrimary) {
      const consumerPrimary = ingredientKeys.has(explicitPrimary)
        ? explicitSecondary.find((value) => !ingredientKeys.has(value)) || "unclassified"
        : explicitPrimary;
      const consumerSecondary = explicitSecondary.filter((value) => (
        !ingredientKeys.has(value) && value !== consumerPrimary
      ));
      const consumerPrimaryType = sellingPointRules.find((rule) => rule.key === consumerPrimary)?.type;
      const sellingPointContextKey = explicitContext || sellingPointContext(tag, consumerPrimary, consumerSecondary);
      return {
        primary_selling_point: consumerPrimary,
        primary_selling_point_type: consumerPrimary === "unclassified"
          ? "unclear"
          : consumerPrimaryType || explicitType || "unclear",
        secondary_selling_points: consumerSecondary,
        ingredient_evidence: explicitIngredients,
        selling_point_combo: [consumerPrimary, ...consumerSecondary].filter((value) => value && value !== "unclassified"),
        selling_point_status: tag.selling_point_status || "explicit",
        selling_point_context: sellingPointContextKey,
        selling_point_components: [consumerPrimary, ...consumerSecondary].filter((value) => value && !["unclassified", "multi_benefit_mix"].includes(value)),
        selling_point_reason: ingredientKeys.has(explicitPrimary)
          ? tag.selling_point_reason || "人工复核仅确认成分依据，未将成分名作为消费者主卖点"
          : tag.selling_point_reason || "人工复核字段明确指定主卖点",
        selling_point_matched_terms: Array.isArray(tag.selling_point_matched_terms) ? tag.selling_point_matched_terms : [],
      };
    }
    const evidence = Array.isArray(tag.evidence_notes)
      ? tag.evidence_notes.join(" ")
      : typeof tag.evidence_notes === "object" && tag.evidence_notes
        ? JSON.stringify(tag.evidence_notes)
        : String(tag.evidence_notes || "");
    const product = String(options.product_name || options.standard_product_name || "");
    const matches = sellingPointRules.map((rule) => {
      const match = evidence.match(rule.pattern);
      return match ? { ...rule, matched_term: match[0], match_index: match.index ?? evidence.search(rule.pattern) } : null;
    }).filter(Boolean);
    const contentSubtype = String(tag.content_direction_l2 || "");
    const productGrouping = String(tag.product_grouping || tag.product_focus || "");
    const multiItemContext = ["bundle_or_series", "multi_product_combination", "selection_set", "product_bundle", "multi_product"].includes(productGrouping)
      || /bundle|routine|pairing|scheduled|assortment|by_skin_need|by_finish|by_scenario/.test(contentSubtype)
      || /跨品类|合集/.test(product);
    const productAffinity = (rule) => (
      (/美白|提亮/.test(product) && rule.key === "brightening_spot")
      || (/防晒/.test(product) && rule.key === "sun_protection")
      || (/气垫|粉底|底妆/.test(product) && ["coverage_even_tone", "longwear_finish", "glow_radiance"].includes(rule.key))
    );
    const isCentral = (rule) => rule.centralPattern.test(evidence);
    const ingredientMatches = matches.filter((rule) => rule.type === "ingredient_formula");
    const sellingPointMatches = matches.filter((rule) => rule.type !== "ingredient_formula");
    const reviewedAsAssortment = /复核纠正：画面重点是多件产品的套组构成与组合价值/.test(evidence);
    const ranked = [...sellingPointMatches].sort((left, right) => {
      const score = (rule) => (
        (isCentral(rule) ? 30 : 0)
        + (productAffinity(rule) ? 35 : 0)
        + (rule.type === "efficacy_benefit" ? 3 : 0)
        + (rule.type === "texture_experience" && /texture|质地/.test(evidence) ? 5 : 0)
      );
      const firstMatch = (rule) => evidence.search(rule.pattern);
      return score(right) - score(left)
        || firstMatch(left) - firstMatch(right)
        || sellingPointRules.indexOf(left) - sellingPointRules.indexOf(right);
    });
    const centralMatches = ranked.filter(isCentral);
    const shouldUseMultiBenefit = multiItemContext
      && sellingPointMatches.length > 0
      && (
        (reviewedAsAssortment && sellingPointMatches.length > 1)
        || (
          centralMatches.length === 0
          && !(!/跨品类|合集/.test(product) && ranked.some(productAffinity))
        )
      );
    const primary = shouldUseMultiBenefit ? null : ranked[0];
    const primaryKey = shouldUseMultiBenefit ? "multi_benefit_mix" : primary?.key || "unclassified";
    const primaryType = shouldUseMultiBenefit ? "multi_benefit" : primary?.type || "unclear";
    const secondary = ranked.filter((rule) => rule.key !== primaryKey).map((rule) => rule.key);
    const reason = shouldUseMultiBenefit
      ? sellingPointMatches.length > 1
        ? `并列命中 ${sellingPointMatches.length} 个利益点，但没有明确主导标题/结果；局部步骤仅作辅助`
        : `组合素材只在局部产品/赠品/步骤中命中“${sellingPointMatches[0].matched_term}”，没有足够证据升级为整条素材主卖点`
      : primary
        ? `${isCentral(primary) ? "核心主张" : productAffinity(primary) ? "画面证据与 Meta 产品语义一致" : "单一明确利益点"}：命中“${primary.matched_term}”`
        : "未发现足以确认核心卖点的画面证据";
    const sellingPointContextKey = explicitContext || sellingPointContext(tag, primaryKey, secondary);
    return {
      primary_selling_point: primaryKey,
      primary_selling_point_type: primaryType,
      secondary_selling_points: secondary,
      ingredient_evidence: ingredientMatches.map((rule) => rule.key),
      selling_point_combo: [primaryKey, ...secondary].filter((value) => value !== "unclassified"),
      selling_point_status: tag.selling_point_status || (primaryKey === "unclassified" ? "unclassified" : "derived_from_reviewed_evidence"),
      selling_point_context: sellingPointContextKey,
      selling_point_components: [primaryKey, ...secondary].filter((value) => value && !["unclassified", "multi_benefit_mix"].includes(value)),
      selling_point_reason: reason,
      selling_point_matched_terms: matches.map((rule) => `${rule.key}:${rule.matched_term}`),
    };
  }

  const canonicalUsageSubtypes = new Map([
    ["routine_steps", "step_by_step_routine"],
    ["multi_step_routine", "step_by_step_routine"],
    ["pdrn_four_step_routine", "step_by_step_routine"],
    ["niacinamide_four_step_routine", "step_by_step_routine"],
    ["barrier_four_step_routine", "step_by_step_routine"],
    ["five_step_brightening_routine", "step_by_step_routine"],
    ["two_step_hydration_routine", "step_by_step_routine"],
    ["three_step_makeup_routine", "step_by_step_routine"],
    ["two_step_brightening_pair", "step_by_step_routine"],
    ["exfoliate_brighten_two_step", "step_by_step_routine"],
    ["am_pm_brightening_routine", "scheduled_routine"],
    ["am_pm_routine", "scheduled_routine"],
    ["night_routine", "scheduled_routine"],
    ["periodic_plan", "scheduled_routine"],
    ["daily_mask_schedule", "scheduled_routine"],
    ["weekly_clay_reset", "scheduled_routine"],
    ["weekly_daily_brightening_duo", "scheduled_routine"],
    ["jelly_pad_usage_guide", "single_product_how_to"],
    ["product_demo", "single_product_how_to"],
    ["multi_use_demo", "single_product_how_to"],
    ["multi_masking", "single_product_how_to"],
    ["product_pair_benefits", "product_pairing_logic"],
    ["quick_routine", "step_by_step_routine"],
    ["daily_routine", "step_by_step_routine"],
    ["clean_girl_routine", "step_by_step_routine"],
    ["two_step_makeup", "step_by_step_routine"],
    ["makeup_prep", "step_by_step_routine"],
    ["day_night_routine", "scheduled_routine"],
  ]);

  const canonicalProductShowcaseSubtypes = new Map([
    ["product_showcase", "single_product_benefits"],
    ["sale_product_showcase", "single_product_benefits"],
    ["tinted_sunscreen_benefits", "single_product_benefits"],
    ["matte_cushion_benefits", "single_product_benefits"],
    ["oily_skin_powder_benefits", "single_product_benefits"],
    ["finish_benefit_comparison", "single_product_benefits"],
    ["product_benefits", "single_product_benefits"],
    ["hero_benefits", "single_product_benefits"],
    ["key_ingredients", "single_product_benefits"],
    ["clinical_or_data_claim", "single_product_benefits"],
    ["product_feature_explainer", "single_product_benefits"],
    ["brightening_protection", "single_product_benefits"],
    ["long_wear_matte", "single_product_benefits"],
    ["pore_refining", "single_product_benefits"],
    ["pore_cleansing", "single_product_benefits"],
    ["routine_bundle_discount_gift", "bundle_assortment"],
    ["makeup_bundle_gift", "bundle_assortment"],
    ["bundle_gift_offer", "bundle_assortment"],
    ["bundle_discount", "bundle_assortment"],
    ["best_seller_assortment", "bundle_assortment"],
  ]);

  const canonicalIngredientSubtypes = new Map([
    ["niacinamide_mask_ingredients", "ingredient_breakdown"],
    ["ingredient_explainer", "ingredient_breakdown"],
  ]);

  function inferEntryAngle(tag, rawL1, rawL2, visualSubject) {
    if (tag.entry_angle) return tag.entry_angle;
    if (rawL1 === "pain_point" || rawL1 === "problem_solution" || /concern|problem|rescue|reset/.test(rawL2)) return "pain_point";
    if (rawL1 === "promotion" || tag.offer_prominence === "offer_primary") return "price_benefit";
    if (rawL1 === "comparison" || /picker|comparison|match|choice/.test(rawL2)) return "choice";
    if (rawL1 === "scenario" || rawL1 === "lifestyle_solution") return "scenario";
    if (rawL1 === "ingredient_science" || /ingredient|key_ingredient/.test(rawL2) || /ingredient/.test(String(tag.proof_type || ""))) return "ingredient";
    if (visualSubject === "before_after" || rawL1 === "efficacy") return "result";
    if (rawL1 === "usage_education" || rawL1 === "routine_education" || rawL1 === "tutorial") return "how_to";
    return "product";
  }

  function inferExplanationMode(tag, rawL1, rawL2, visualSubject) {
    if (tag.explanation_mode) return tag.explanation_mode;
    const proof = String(tag.proof_type || "").toLowerCase();
    if (rawL1 === "ingredient_science" || /ingredient/.test(rawL2) || /ingredient/.test(proof)) return "ingredient_mechanism";
    if (visualSubject === "before_after" || proof === "before_after") return "before_after";
    if (rawL1 === "usage_education" || rawL1 === "routine_education" || rawL1 === "tutorial") return "usage_demo";
    if (rawL1 === "comparison") return "choice_guide";
    if (rawL1 === "social_proof" || rawL1 === "review_social_proof") return "user_proof";
    if (rawL1 === "promotion" || tag.offer_prominence === "offer_primary") return "offer_message";
    if (rawL1 === "problem_solution" || rawL1 === "pain_point") return "problem_solution";
    if (rawL1 === "efficacy") return "benefit_explainer";
    return "benefit_explainer";
  }

  const canonicalComparisonSubtypes = new Map([
    ["shade_match", "shade_match"],
    ["shade_comparison", "shade_match"],
    ["shade_try_on", "shade_match"],
    ["shade_range", "shade_match"],
    ["shade_matching", "shade_match"],
    ["shade_selection", "shade_match"],
    ["finish_skin_type_picker", "by_skin_need"],
    ["skin_concern_picker", "by_skin_need"],
    ["skin_concern_routine", "by_skin_need"],
    ["skin_need_moisturizer_picker", "by_skin_need"],
    ["finish_skin_need_picker", "by_skin_need"],
    ["clay_stick_skin_concern_picker", "by_skin_need"],
    ["cushion_finish_skin_type_comparison", "by_skin_need"],
    ["cushion_finish_comparison", "by_finish"],
    ["glow_vs_matte_routine", "by_finish"],
    ["makeup_look_pairing", "by_finish"],
    ["occasion_routine", "by_scenario"],
    ["by_weather_need", "by_scenario"],
    ["by_occasion", "by_scenario"],
    ["occasion_picker", "by_scenario"],
    ["by_age_and_skin_need", "by_skin_need"],
    ["benefit_comparison", "benefit_parameter_comparison"],
    ["product_variant_comparison", "benefit_parameter_comparison"],
    ["cost_saving_alternative", "benefit_parameter_comparison"],
  ]);

  const canonicalScenarioSubtypes = new Map([
    ["daily_scene", "daily_use_scene"],
    ["daily_use_scene", "daily_use_scene"],
    ["daily_lifestyle_demo", "daily_use_scene"],
    ["usage_scenarios", "daily_use_scene"],
    ["no_makeup_day", "daily_use_scene"],
    ["quick_get_ready_scene", "daily_use_scene"],
    ["one_product_grwm", "daily_use_scene"],
    ["five_minute_grwm", "daily_use_scene"],
    ["travel_scene", "specific_context_scene"],
    ["travel_essentials", "specific_context_scene"],
    ["office_scene", "specific_context_scene"],
    ["specific_context_scene", "specific_context_scene"],
    ["seasonal_scene", "seasonal_scene"],
    ["seasonal_essentials", "seasonal_scene"],
    ["hot_weather_makeup", "seasonal_scene"],
    ["summer_skincare", "seasonal_scene"],
    ["outdoor_sports_scene", "seasonal_scene"],
    ["special_event_scene", "specific_context_scene"],
  ]);

  const canonicalEfficacySubtypes = new Map([
    ["before_after", "instant_before_after"],
    ["instant_before_after", "instant_before_after"],
    ["glass_skin_two_step_before_after", "instant_before_after"],
    ["multi_day_progress", "multi_day_progress"],
    ["progressive_before_after", "multi_day_progress"],
    ["time_progression_result", "multi_day_progress"],
    ["time_based_benefits", "multi_day_progress"],
    ["brightening_14_day_progress", "multi_day_progress"],
    ["brightening_21_day_progress", "multi_day_progress"],
    ["single_use_result", "single_use_result"],
    ["ten_minute_premakeup_rescue", "single_use_result"],
    ["routine_before_after", "routine_overall_result"],
    ["routine_overall_result", "routine_overall_result"],
  ]);

  const canonicalProblemSubtypes = new Map([
    ["skin_concern_solution", "skin_concern_solution"],
    ["multi_concern_solution", "skin_concern_solution"],
    ["at_home_glow_solution", "skin_concern_solution"],
    ["makeup_problem_solution", "makeup_problem_solution"],
    ["base_makeup_solution", "makeup_problem_solution"],
    ["recovery_solution", "recovery_solution"],
    ["after_sun_recovery", "recovery_solution"],
    ["redness_rescue_routine", "recovery_solution"],
    ["post_sun_two_step_reset", "recovery_solution"],
  ]);

  const canonicalSocialProofSubtypes = new Map([
    ["customer_review", "word_of_mouth_proof"],
    ["daily_favorite", "word_of_mouth_proof"],
    ["rating_proof", "word_of_mouth_proof"],
    ["everyday_base_rating", "word_of_mouth_proof"],
    ["creator_social_proof", "word_of_mouth_proof"],
    ["ugc_group_demo", "word_of_mouth_proof"],
    ["word_of_mouth_proof", "word_of_mouth_proof"],
  ]);

  function normalizeProofType(value) {
    const raw = String(value || "none").toLowerCase();
    if (raw === "before_after") return "before_after";
    if (["routine_steps", "demonstration", "product_demo", "usage_instructions", "ugc_demo"].includes(raw)) return "demonstration";
    if (["selection_guide", "benefit_comparison", "swatch_comparison", "shade_comparison", "comparison", "finish_comparison", "benefit_pairing"].includes(raw)) return "comparison_proof";
    if (["review", "rating", "creator_claim"].includes(raw)) return "social_proof_evidence";
    if (["clinical_or_data", "data_claim"].includes(raw)) return "clinical_data";
    if (["benefit_message", "benefit_callout", "ingredient_or_benefit_message", "ingredient_explanation", "ingredient_explainer", "benefit_claim", "problem_solution", "product_showcase"].includes(raw)) return "benefit_claim";
    return "none";
  }

  function normalizeOfferType(tag = {}) {
    const rawOffer = String(tag.offer_type || "none").toLowerCase();
    const subtype = String(tag.content_direction_l2 || "").toLowerCase();
    if (subtype === "buy_one_get_one" || rawOffer === "buy_one_get_one") return "buy_one_get_one";
    if (["gift", "free_gift", "discount_gift"].includes(rawOffer) || /gift/.test(subtype)) return "free_gift";
    if (rawOffer === "bundle" || rawOffer === "bundle_price") return "bundle_price";
    if (rawOffer === "limited_time" || /seasonal|urgency|limited/.test(subtype)) return "limited_time";
    if (rawOffer === "price_anchor") return "price_anchor";
    if (rawOffer === "discount" || /sale|discount|offer/.test(subtype)) return "direct_discount";
    return rawOffer === "none" || !rawOffer ? "none" : rawOffer;
  }

  function normalizeProductGrouping(tag = {}) {
    const raw = String(tag.product_focus || tag.product_grouping || "").toLowerCase();
    if (["single_product", "single_shade"].includes(raw)) return "single_product";
    if (["product_bundle", "product_series"].includes(raw)) return "bundle_or_series";
    if (["multiple_products", "multi_product_routine", "product_pair", "multi_product_pairing", "multiple_units"].includes(raw)) {
      return "multi_product_combination";
    }
    if (["multi_product_selection", "shade_range"].includes(raw)) return "selection_set";
    return raw || "unknown";
  }

  function normalizeContentTag(tag = {}, options = {}) {
    const rawL1 = String(tag.raw_content_direction_l1 || tag.content_direction_l1 || "unclear");
    const rawL2 = String(tag.raw_content_direction_l2 || tag.content_direction_l2 || "unclear");
    const visualSubject = String(tag.visual_subject || "").toLowerCase();
    const offerType = normalizeOfferType(tag);
    const productGrouping = normalizeProductGrouping(tag);
    const evidence = String(tag.evidence_notes || "").toLowerCase();
    let contentDirectionL1 = ({
      pain_point: "problem_solution",
      tutorial: "usage_education",
      routine_education: "usage_education",
      product_education: "product_showcase",
      lifestyle_solution: "scenario",
      review_social_proof: "social_proof",
    })[rawL1] || rawL1;
    let contentDirectionL2 = rawL2;

    if (canonicalProductShowcaseSubtypes.has(rawL2)) {
      contentDirectionL1 = "product_showcase";
      contentDirectionL2 = canonicalProductShowcaseSubtypes.get(rawL2);
    } else if (canonicalIngredientSubtypes.has(rawL2) || rawL1 === "ingredient_science") {
      // Ingredient is an explanation mode, not a reusable top-level content
      // direction. Route each asset by the job its content is doing.
      if (rawL2 === "ingredient_pairing" || /搭配|组合|pairing|together/.test(evidence)) {
        contentDirectionL1 = "usage_education";
        contentDirectionL2 = "product_pairing_logic";
      } else if (/问题|适用|暗沉|痘印|干燥|泛红|concern|problem|dull|acne|dry|redness/.test(evidence)) {
        contentDirectionL1 = "problem_solution";
        contentDirectionL2 = "skin_concern_solution";
      } else {
        contentDirectionL1 = "product_showcase";
        contentDirectionL2 = "single_product_benefits";
      }
    } else if (canonicalEfficacySubtypes.has(rawL2)) {
      contentDirectionL1 = "efficacy";
      contentDirectionL2 = canonicalEfficacySubtypes.get(rawL2);
    } else if (canonicalComparisonSubtypes.has(rawL2)) {
      contentDirectionL1 = "comparison";
      contentDirectionL2 = canonicalComparisonSubtypes.get(rawL2);
    } else if (canonicalUsageSubtypes.has(rawL2)) {
      contentDirectionL1 = "usage_education";
      contentDirectionL2 = canonicalUsageSubtypes.get(rawL2);
    } else if (canonicalProblemSubtypes.has(rawL2)) {
      contentDirectionL1 = "problem_solution";
      contentDirectionL2 = canonicalProblemSubtypes.get(rawL2);
    } else if (rawL2 === "purchase_confusion_solution" || rawL2 === "purchase_education") {
      contentDirectionL1 = "usage_education";
      contentDirectionL2 = "purchase_education";
    } else if (canonicalSocialProofSubtypes.has(rawL2) || ["social_proof", "review_social_proof"].includes(rawL1)) {
      contentDirectionL1 = "social_proof";
      contentDirectionL2 = canonicalSocialProofSubtypes.get(rawL2) || "word_of_mouth_proof";
    } else if (canonicalScenarioSubtypes.has(rawL2)) {
      contentDirectionL1 = "scenario";
      contentDirectionL2 = canonicalScenarioSubtypes.get(rawL2);
    } else if (rawL1 === "promotion" && /before_after/.test(visualSubject)) {
      contentDirectionL1 = "efficacy";
      contentDirectionL2 = /routine/.test(visualSubject) ? "routine_overall_result" : "instant_before_after";
    } else if (rawL1 === "promotion" && /shade|lip_before_after/.test(`${rawL2} ${visualSubject} ${tag.product_focus || ""}`)) {
      contentDirectionL1 = "comparison";
      contentDirectionL2 = "shade_match";
    } else if (rawL1 === "promotion" && /skin_concern|picker/.test(`${rawL2} ${visualSubject}`)) {
      contentDirectionL1 = "comparison";
      contentDirectionL2 = "by_skin_need";
    } else if (rawL1 === "promotion") {
      contentDirectionL1 = "product_showcase";
      contentDirectionL2 = /bundle|routine|day_night/.test(`${rawL2} ${visualSubject} ${tag.product_focus || ""}`)
        || ["bundle_or_series", "multi_product_combination", "selection_set"].includes(productGrouping)
        ? "bundle_assortment"
        : "single_product_benefits";
    } else if (rawL1 === "problem_solution" || rawL1 === "pain_point") {
      contentDirectionL1 = "problem_solution";
      contentDirectionL2 = /finish|coverage|makeup|summer_base/.test(rawL2)
        ? "makeup_problem_solution"
        : /post_sun|redness|dry_rough/.test(rawL2)
          ? "recovery_solution"
          : "skin_concern_solution";
    } else if (["usage_education", "routine_education", "tutorial"].includes(rawL1)) {
      contentDirectionL1 = "usage_education";
      contentDirectionL2 = visualSubject.includes("routine") ? "step_by_step_routine" : "single_product_how_to";
    } else if (rawL1 === "product_showcase" || rawL1 === "product_education") {
      contentDirectionL1 = "product_showcase";
      contentDirectionL2 = /bundle|routine|assortment/.test(rawL2)
        || /product_bundle|product_routine/.test(visualSubject)
        ? "bundle_assortment"
        : "single_product_benefits";
    } else if (rawL1 === "comparison") {
      contentDirectionL1 = "comparison";
      contentDirectionL2 = /shade/.test(rawL2) ? "shade_match"
        : /skin|concern|age/.test(rawL2) ? "by_skin_need"
          : /finish/.test(rawL2) ? "by_finish"
            : /scenario|weather|occasion/.test(rawL2) ? "by_scenario"
              : "benefit_parameter_comparison";
    } else if (rawL1 === "scenario" || rawL1 === "lifestyle_solution") {
      contentDirectionL1 = "scenario";
      contentDirectionL2 = /travel|office|event|occasion/.test(rawL2) ? "specific_context_scene"
          : /summer|season|weather|outdoor/.test(rawL2) ? "seasonal_scene"
            : "daily_use_scene";
    } else if (rawL1 === "efficacy") {
      contentDirectionL1 = "product_showcase";
      contentDirectionL2 = "single_product_benefits";
    }

    const durationMatch = rawL2.match(/(\d+)_day/);
    const stepMatch = rawL2.match(/(two|three|four|five)_step|(?:^|_)(\d+)_step/);
    const stepWords = { two: 2, three: 3, four: 4, five: 5 };
    const reviewedContentDirectionL1 = String(tag.reviewed_content_direction_l1 || "");
    const reviewedContentDirectionL2 = String(tag.reviewed_content_direction_l2 || "");
    const usableReviewedContentDirectionL1 = reviewedContentDirectionL1 === "promotion" ? "" : reviewedContentDirectionL1;
    const usableReviewedContentDirectionL2 = reviewedContentDirectionL2 === "offer_led" ? "" : reviewedContentDirectionL2;
    return {
      ...tag,
      raw_content_direction_l1: rawL1,
      raw_content_direction_l2: rawL2,
      raw_proof_type: tag.raw_proof_type || tag.proof_type || "none",
      content_direction_l1: usableReviewedContentDirectionL1 || contentDirectionL1,
      content_direction_l2: usableReviewedContentDirectionL2 || contentDirectionL2,
      entry_angle: inferEntryAngle(tag, rawL1, rawL2, visualSubject),
      explanation_mode: tag.reviewed_explanation_mode || inferExplanationMode(tag, rawL1, rawL2, visualSubject),
      proof_type: tag.reviewed_proof_type || normalizeProofType(tag.raw_proof_type || tag.proof_type),
      offer_type: offerType,
      product_grouping: productGrouping,
      product_grouping_detail: tag.product_focus || "",
      gift_relation: ["free_gift", "buy_one_get_one"].includes(offerType) ? "product_gift" : "no_gift",
      offer_prominence: tag.offer_prominence
        || (rawL1 === "promotion" ? "offer_primary" : offerType === "none" ? "offer_none" : "offer_supporting"),
      duration_claim: tag.duration_claim || (durationMatch ? `${durationMatch[1]} days` : ""),
      step_count: tag.step_count || (stepMatch ? Number(stepMatch[2] || stepWords[stepMatch[1]]) : null),
      ...sellingPointFromTag({
        ...tag,
        content_direction_l1: usableReviewedContentDirectionL1 || contentDirectionL1,
        content_direction_l2: usableReviewedContentDirectionL2 || contentDirectionL2,
        product_grouping: productGrouping,
      }, options),
    };
  }

  function regionForCountry(country) {
    const value = String(country || "").trim().toUpperCase();
    if (!value || value === "UNKNOWN") return "未识别地区";
    if (value === "SA" || value === "AE") return "中东";
    if (value === "US") return "美国";
    if (value === "MX") return "墨西哥";
    return "澳英加";
  }

  function groupKey(row = {}) {
    return [
      productName(row),
      row.material_type || "未分类",
    ].join("||");
  }

  function ratio(numerator, denominator, empty = 0) {
    return Number(denominator || 0) ? Number(numerator || 0) / Number(denominator) : empty;
  }

  function deriveMetrics(row) {
    return {
      ...row,
      roas: ratio(row.purchase_value, row.spend),
      cpa: row.purchase_times ? ratio(row.spend, row.purchase_times) : null,
      ctr: ratio(row.inline_link_clicks, row.impressions),
      cvr: ratio(row.purchase_times, row.outbound_clicks),
      cpm: row.impressions ? ratio(row.spend * 1000, row.impressions) : 0,
      aov: row.purchase_times ? ratio(row.purchase_value, row.purchase_times) : null,
    };
  }

  function aggregateCreatives(rows = [], options = {}) {
    const combineCountries = options.combineCountries !== false;
    const groups = new Map();
    for (const source of rows || []) {
      const identity = creativeIdentity(source);
      const key = [identity.key, groupKey(source), combineCountries ? "" : (source.country || "Unknown")].join("||");
      if (!groups.has(key)) {
        groups.set(key, {
          material_id: identity.id,
          creative_key: identity.key,
          identity_source: identity.source,
          material_code: validMaterialCode(source.material_code),
          material_name: source.material_name || source.ad_name || "",
          ad_id: source.ad_id || "",
          country: source.country || "Unknown",
          standard_product_name: productName(source),
          product_name: productName(source),
          product_source: "meta",
          material_type: source.material_type || "未分类",
          video_source: source.video_source || "",
          video_subtype: source.video_subtype || "",
          account_name: source.account_name || "",
          operator: source.operator || "",
          countries: new Set(),
          region_totals: {},
          dates: new Set(),
          ...Object.fromEntries(additiveFields.map((field) => [field, 0])),
        });
      }
      const target = groups.get(key);
      target.countries.add(source.country || "Unknown");
      if (source.date_start) target.dates.add(source.date_start);
      additiveFields.forEach((field) => {
        target[field] += Number(source[field] || 0);
      });
      const region = regionForCountry(source.country);
      if (!target.region_totals[region]) {
        target.region_totals[region] = {
          region,
          dates: new Set(),
          ...Object.fromEntries(additiveFields.map((field) => [field, 0])),
        };
      }
      const regionTarget = target.region_totals[region];
      if (source.date_start) regionTarget.dates.add(source.date_start);
      additiveFields.forEach((field) => {
        regionTarget[field] += Number(source[field] || 0);
      });
    }
    return [...groups.values()].map((row) => {
      const dates = [...row.dates].sort();
      const countries = [...row.countries].sort();
      const regionPerformance = Object.values(row.region_totals).map((regionRow) => deriveMetrics({
        ...regionRow,
        active_days: regionRow.dates.size,
        dates: undefined,
      })).sort((left, right) => right.purchase_value - left.purchase_value);
      return deriveMetrics({
        ...row,
        country: countries.length === 1 ? countries[0] : "多地区",
        countries,
        region_performance: regionPerformance,
        active_days: row.dates.size,
        first_date: dates[0] || "",
        last_date: dates.at(-1) || "",
        region_totals: undefined,
        dates: undefined,
      });
    });
  }

  function quantile(values, fraction) {
    const sorted = (values || []).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (!sorted.length) return null;
    if (sorted.length === 1) return sorted[0];
    const position = (sorted.length - 1) * fraction;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  }

  function percentileRank(values, value) {
    const sorted = (values || []).filter((entry) => Number.isFinite(entry)).sort((a, b) => a - b);
    if (!sorted.length || !Number.isFinite(value)) return null;
    const below = sorted.filter((entry) => entry < value).length;
    const equal = sorted.filter((entry) => entry === value).length;
    return (below + equal * 0.5) / sorted.length;
  }

  function evidenceStatus(row) {
    if (row.purchase_times >= 5) return "sufficient";
    if (row.purchase_times >= 1) return "directional";
    return "insufficient";
  }

  function benchmarkStatus(eligibleCount) {
    return eligibleCount > 1 ? "ranking" : "single";
  }

  function buildGroupBenchmarks(creatives) {
    const grouped = new Map();
    creatives.forEach((row) => {
      const key = groupKey(row);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });

    return [...grouped.entries()].map(([key, rows]) => {
      rows.forEach((row) => {
        row.evidence_status = evidenceStatus(row);
      });
      const eligible = rows.filter((row) => row.purchase_times >= 1);
      const metricValues = Object.fromEntries(["roas", "cpa", "ctr", "cvr", "cpm", "aov"].map((metric) => [
        metric,
        eligible.map((row) => row[metric]).filter((value) => Number.isFinite(value)),
      ]));
      const quartiles = Object.fromEntries(Object.entries(metricValues).map(([metric, values]) => [metric, {
        p25: quantile(values, 0.25),
        p50: quantile(values, 0.5),
        p75: quantile(values, 0.75),
      }]));
      return {
        group_key: key,
        standard_product_name: rows[0]?.standard_product_name || "未识别产品",
        material_type: rows[0]?.material_type || "未分类",
        creative_count: rows.length,
        eligible_count: eligible.length,
        benchmark_status: benchmarkStatus(eligible.length),
        quartiles,
        metric_values: metricValues,
      };
    });
  }

  function change(current, previous) {
    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
    return (current - previous) / previous;
  }

  function weightedRegionMetric(currentRegions, baselineRegions, metric) {
    const currentMap = new Map((currentRegions || []).map((row) => [row.region, row]));
    const comparable = (baselineRegions || []).filter((row) => (
      row.region !== "未识别地区"
      && row.spend > 0
      && currentMap.has(row.region)
      && Number.isFinite(row[metric])
      && Number.isFinite(currentMap.get(row.region)[metric])
    ));
    const weightTotal = comparable.reduce((sum, row) => sum + row.spend, 0);
    if (!weightTotal) return { current: null, baseline: null };
    return comparable.reduce((result, row) => {
      const weight = row.spend / weightTotal;
      result.baseline += row[metric] * weight;
      result.current += currentMap.get(row.region)[metric] * weight;
      return result;
    }, { current: 0, baseline: 0 });
  }

  function trendFor(current, baseline, recentDays = 3, baselineDays = 7) {
    if (!baseline) return {
      spend_change: null,
      roas_change: null,
      ctr_change: null,
      cvr_change: null,
      cpa_change: null,
      conversion_change: null,
      spend_comparable: false,
      history_qualified: false,
      fatigue_warning: false,
    };
    const roasPair = weightedRegionMetric(current.region_performance, baseline.region_performance, "roas");
    const cvrPair = weightedRegionMetric(current.region_performance, baseline.region_performance, "cvr");
    const cpaPair = weightedRegionMetric(current.region_performance, baseline.region_performance, "cpa");
    const currentDailySpend = ratio(current.spend, recentDays);
    const baselineDailySpend = ratio(baseline.spend, baselineDays);
    const spendComparable = baselineDailySpend > 0 && currentDailySpend >= baselineDailySpend * 0.7;
    const currentDailyConversions = ratio(current.purchase_times, recentDays);
    const baselineDailyConversions = ratio(baseline.purchase_times, baselineDays);
    const roasChange = change(
      roasPair.current ?? current.roas,
      roasPair.baseline ?? baseline.roas,
    );
    const cvrChange = change(
      cvrPair.current ?? current.cvr,
      cvrPair.baseline ?? baseline.cvr,
    );
    const cpaChange = change(
      cpaPair.current ?? current.cpa,
      cpaPair.baseline ?? baseline.cpa,
    );
    const conversionChange = change(currentDailyConversions, baselineDailyConversions);
    const historyQualified = baseline.roas >= 2 && baseline.purchase_times >= 5;
    const auxiliaryDecline = (cvrChange !== null && cvrChange <= -0.1)
      || (cpaChange !== null && cpaChange >= 0.2)
      || (spendComparable && conversionChange !== null && conversionChange <= -0.2);
    return {
      spend_change: change(currentDailySpend, baselineDailySpend),
      roas_change: roasChange,
      ctr_change: change(current.ctr, baseline.ctr),
      cvr_change: cvrChange,
      cpa_change: cpaChange,
      conversion_change: conversionChange,
      spend_comparable: spendComparable,
      history_qualified: historyQualified,
      fatigue_warning: historyQualified
        && spendComparable
        && roasChange !== null
        && roasChange <= -0.15
        && auxiliaryDecline,
    };
  }

  function dateValue(value) {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function isoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function shiftDate(value, days) {
    const date = dateValue(value);
    if (!date) return "";
    date.setUTCDate(date.getUTCDate() + days);
    return isoDate(date);
  }

  function rowsBetween(rows, start, end) {
    return (rows || []).filter((row) => row.date_start >= start && row.date_start <= end);
  }

  function decisionWindows(rows = [], anchorDate = "") {
    const dates = [...new Set(rows.map((row) => row.date_start).filter(Boolean))].sort();
    const maxAvailableDate = dates.at(-1) || "";
    const resolvedAnchorDate = anchorDate || maxAvailableDate;
    if (!resolvedAnchorDate) {
      return {
        recent: [],
        baseline: [],
        priorObservation: [],
        maxDate: "",
        anchorDate: "",
        maxAvailableDate: "",
        anchorHasData: false,
      };
    }
    const recentStart = shiftDate(resolvedAnchorDate, -2);
    const baselineEnd = shiftDate(recentStart, -1);
    const baselineStart = shiftDate(baselineEnd, -6);
    const priorStart = shiftDate(recentStart, -3);
    return {
      maxDate: resolvedAnchorDate,
      anchorDate: resolvedAnchorDate,
      maxAvailableDate,
      anchorHasData: dates.includes(resolvedAnchorDate),
      recentStart,
      baselineStart,
      baselineEnd,
      recent: rowsBetween(rows, recentStart, resolvedAnchorDate),
      baseline: rowsBetween(rows, baselineStart, baselineEnd),
      priorObservation: rowsBetween(rows, priorStart, baselineEnd),
    };
  }

  function referenceCpaIndex(rows = []) {
    const levels = {
      regionProduct: new Map(),
      product: new Map(),
      region: new Map(),
      overall: { purchase_value: 0, purchase_times: 0 },
    };
    function add(map, key, row) {
      if (!map.has(key)) map.set(key, { purchase_value: 0, purchase_times: 0 });
      const target = map.get(key);
      target.purchase_value += Number(row.purchase_value || 0);
      target.purchase_times += Number(row.purchase_times || 0);
    }
    rows.forEach((row) => {
      if (Number(row.purchase_times || 0) <= 0 || Number(row.purchase_value || 0) <= 0) return;
      const product = productName(row);
      const region = regionForCountry(row.country);
      add(levels.regionProduct, `${region}||${product}`, row);
      add(levels.product, product, row);
      add(levels.region, region, row);
      levels.overall.purchase_value += Number(row.purchase_value || 0);
      levels.overall.purchase_times += Number(row.purchase_times || 0);
    });
    function toCpa(record) {
      return record?.purchase_times > 0 ? ratio(record.purchase_value, record.purchase_times) / 2 : null;
    }
    return {
      get(region, product) {
        return toCpa(levels.regionProduct.get(`${region}||${product}`))
          || toCpa(levels.product.get(product))
          || toCpa(levels.region.get(region))
          || toCpa(levels.overall);
      },
    };
  }

  function expectedConversions(row, cpaIndex) {
    return (row.region_performance || []).reduce((sum, regionRow) => {
      const referenceCpa = cpaIndex.get(regionRow.region, row.standard_product_name);
      return sum + (referenceCpa ? ratio(regionRow.spend, referenceCpa) : 0);
    }, 0);
  }

  function classify(row, baseline, priorObservation) {
    const notes = [];
    const trend = trendFor(row, baseline);
    if (row.purchase_times === 0 && row.expected_conversions >= 1.5) {
      notes.push(`零成交，地区标准化预期转化已达 ${row.expected_conversions.toFixed(1)}`);
      return { decision: "pause", notes, trend, efficiencyStatus: "零成交且花费已达判断门槛" };
    }
    if (trend.fatigue_warning) {
      const stillQualified = row.roas >= 2;
      notes.push("近3天 ROAS 较此前7天下降至少15%，且转化效率同步恶化");
      return {
        decision: "fatigue",
        notes,
        trend,
        efficiencyStatus: stillQualified ? "效率回落但仍达扩量线" : "衰退预警且已跌破扩量线",
      };
    }
    const consecutiveUnderperform = row.purchase_times >= 3
      && row.roas < 2
      && priorObservation?.purchase_times >= 3
      && priorObservation.roas < 2;
    if (consecutiveUnderperform) {
      notes.push("连续两个3天观察周期 ROI 低于2，且每期至少3个转化");
      return { decision: "pause", notes, trend, efficiencyStatus: "连续未达标" };
    }
    if (row.roas >= 2 && row.purchase_times >= 5) {
      notes.push("近3天 ROI 达到2，且转化数不少于5");
      return { decision: "scale", notes, trend, efficiencyStatus: "达到扩量粗筛线" };
    }
    if (row.roas >= 2 && row.purchase_times >= 1 && row.purchase_times < 5) {
      notes.push("近3天 ROI 达到2，但转化数仍在1–4之间，需要继续验证");
      return { decision: "potential", notes, trend, efficiencyStatus: "效率达标，样本待积累" };
    }
    if (row.purchase_times === 0) notes.push("当前零成交，但地区标准化花费尚未达到停投门槛");
    else if (!baseline) notes.push("历史数据不足，暂不判断衰退");
    else if (!trend.spend_comparable) notes.push("近期日均花费低于历史的70%，暂不判断衰退");
    else notes.push("当前未达到绝对扩量线，继续观察成交与效率稳定性");
    return { decision: "observe", notes, trend, efficiencyStatus: "数据观察" };
  }

  function regionPerformanceLabel(regionPerformance = []) {
    const eligible = regionPerformance.filter((row) => (
      row.region !== "未识别地区"
      && row.impressions >= 1000
      && row.purchase_times >= 1
      && row.spend > 0
    ));
    if (eligible.length < 2) return "地区样本不足";
    const totalSpend = eligible.reduce((sum, row) => sum + row.spend, 0);
    const totalValue = eligible.reduce((sum, row) => sum + row.purchase_value, 0);
    const averageRoas = ratio(totalValue, totalSpend);
    const ranked = [...eligible].sort((left, right) => right.roas - left.roas);
    const stable = averageRoas > 0 && eligible.every((row) => Math.abs(row.roas / averageRoas - 1) <= 0.2);
    if (stable) return "多地区稳定";
    const [top, second] = ranked;
    if (top.purchase_times >= 3 && (
      top.roas >= averageRoas * 1.2
      || (second && top.roas >= second.roas * 1.25)
    )) return `${top.region}突出`;
    return "地区差异较大";
  }

  function decisionConfidence(benchmarkStatusValue) {
    if (benchmarkStatusValue === "sufficient") return "high";
    if (benchmarkStatusValue === "directional") return "medium";
    return "low";
  }

  function contentKey(row, tag) {
    const normalizedTag = normalizeContentTag(tag);
    return [
      row.material_type,
      normalizedTag.content_direction_l1 || "unclear",
      normalizedTag.content_direction_l2 || "unclear",
      normalizedTag.proof_type || "none",
      normalizedTag.offer_type || "none",
      normalizedTag.entry_angle || "unclear",
      normalizedTag.explanation_mode || "unclear",
      row.material_type === "视频" ? (normalizedTag.hook_type || "unclear") : "",
      row.material_type === "视频" ? (normalizedTag.script_structure || "unclear") : "",
    ].join("||");
  }

  function buildContentInsights(creatives, contentTags = {}) {
    const groups = new Map();
    creatives.forEach((row) => {
      if (Number(row.spend || 0) <= 0) return;
      const tag = contentTags[row.material_id] || contentTags[row.creative_key];
      if (!tag) return;
      const normalizedTag = normalizeContentTag(tag);
      const key = contentKey(row, normalizedTag);
      if (!groups.has(key)) {
        groups.set(key, {
          material_type: row.material_type,
          media_type: normalizedTag.media_type || (row.material_type === "视频" ? "video" : "image"),
          content_direction_l1: normalizedTag.content_direction_l1 || "unclear",
          content_direction_l2: normalizedTag.content_direction_l2 || "unclear",
          proof_type: normalizedTag.proof_type || "none",
          offer_type: normalizedTag.offer_type || "none",
          entry_angle: normalizedTag.entry_angle || "unclear",
          explanation_mode: normalizedTag.explanation_mode || "unclear",
          hook_type: normalizedTag.hook_type || "",
          script_structure: normalizedTag.script_structure || "",
          review_status_mix: {},
          material_ids_set: new Set(),
          creative_count: 0,
          matched_asset_count: 0,
          confidence_mix: { high: 0, medium: 0, low: 0 },
          products_set: new Set(),
          countries_set: new Set(),
          regions_set: new Set(),
          material_ids: [],
          ...Object.fromEntries(additiveFields.map((field) => [field, 0])),
        });
      }
      const target = groups.get(key);
      target.material_ids_set.add(row.material_id);
      target.products_set.add(row.standard_product_name || "未识别产品");
      (row.countries || [row.country || "Unknown"]).forEach((country) => {
        target.countries_set.add(country);
        target.regions_set.add(regionForCountry(country));
      });
      target.creative_count = target.material_ids_set.size;
      target.matched_asset_count += row.asset ? 1 : 0;
      target.material_ids.push(row.material_id);
      const confidence = ["high", "medium", "low"].includes(normalizedTag.confidence) ? normalizedTag.confidence : "low";
      target.confidence_mix[confidence] += 1;
      if (normalizedTag.review_status) {
        target.review_status_mix[normalizedTag.review_status] = (target.review_status_mix[normalizedTag.review_status] || 0) + 1;
      }
      additiveFields.forEach((field) => {
        target[field] += Number(row[field] || 0);
      });
    });
    return [...groups.values()].map((row) => ({
      ...deriveMetrics(row),
      material_ids: [...row.material_ids_set],
      product_coverage_count: row.products_set.size,
      country_coverage_count: row.countries_set.size,
      products: [...row.products_set],
      countries: [...row.countries_set],
      regions: [...row.regions_set],
      review_status: Object.keys(row.review_status_mix).length
        ? Object.entries(row.review_status_mix)
          .sort((left, right) => right[1] - left[1])[0][0]
        : "",
      conclusion_status: row.creative_count >= 3 ? "supported" : "example_only",
    })).sort((left, right) => right.spend - left.spend);
  }

  function buildPromotionSummary(creatives, contentTags = {}) {
    const materialRows = aggregateCreatives(creatives, { combineCountries: true });
    const groups = new Map();
    materialRows.forEach((row) => {
      const tag = contentTags[row.material_id] || contentTags[row.creative_key];
      const normalizedTag = tag ? normalizeContentTag(tag) : null;
      const offerProminence = normalizedTag?.offer_prominence || "offer_unclassified";
      const key = offerProminence;
      if (!groups.has(key)) {
        groups.set(key, {
          offer_prominence: offerProminence,
          material_ids_set: new Set(),
          ...Object.fromEntries(additiveFields.map((field) => [field, 0])),
        });
      }
      const target = groups.get(key);
      target.material_ids_set.add(`${row.creative_key}||${row.standard_product_name}||${row.material_type}`);
      additiveFields.forEach((field) => {
        target[field] += Number(row[field] || 0);
      });
    });
    return [...groups.values()]
      .map((row) => ({
        ...deriveMetrics(row),
        creative_count: row.material_ids_set.size,
        material_ids: [...row.material_ids_set],
        material_ids_set: undefined,
      }))
      .sort((left, right) => (
        ({ offer_none: 0, offer_supporting: 1, offer_primary: 2, offer_unclassified: 3 }[left.offer_prominence] ?? 4)
        - ({ offer_none: 0, offer_supporting: 1, offer_primary: 2, offer_unclassified: 3 }[right.offer_prominence] ?? 4)
      ));
  }

  function buildSellingPointPerformance(creatives = [], contentTags = {}) {
    const materialRows = new Map();
    creatives.forEach((source) => {
      if (Number(source.spend || 0) <= 0) return;
      const key = [source.creative_key || `code:${source.material_id}`, productName(source), source.material_type || "未分类"].join("||");
      if (!materialRows.has(key)) {
        materialRows.set(key, {
          ...source,
          standard_product_name: productName(source),
          countries: new Set(source.countries || [source.country || "Unknown"]),
          ...Object.fromEntries(additiveFields.map((field) => [field, 0])),
        });
      }
      const target = materialRows.get(key);
      (source.countries || [source.country || "Unknown"]).forEach((country) => target.countries.add(country));
      additiveFields.forEach((field) => {
        target[field] += Number(source[field] || 0);
      });
      if (!target.asset && source.asset) target.asset = source.asset;
      if (!target.decision_snapshot && source.decision_snapshot) target.decision_snapshot = source.decision_snapshot;
    });

    const pointGroups = new Map();
    [...materialRows.values()].forEach((source) => {
      const rawTag = source.content_tag || contentTags[source.material_id] || contentTags[source.creative_key];
      if (!rawTag) return;
      const tag = normalizeContentTag(rawTag, { product_name: productName(source) });
      const point = tag.primary_selling_point || "unclassified";
      const type = tag.primary_selling_point_type || "unclear";
      const product = source.standard_product_name || "未识别产品";
      const context = tag.selling_point_context || "unresolved_result";
      // A bundle, routine, or selection card can contain the same concrete
      // benefits but make a different promise. Keep those promises separate so
      // their performance is not collapsed into one generic "combination" row.
      const key = `${product}||${point}||${context}`;
      if (!pointGroups.has(key)) {
        pointGroups.set(key, {
          standard_product_name: product,
          primary_selling_point: point,
          primary_selling_point_type: type,
          selling_point_context: context,
          material_ids_set: new Set(),
          countries_set: new Set(),
          regions_set: new Set(),
          content_directions_set: new Set(),
          entry_angles_set: new Set(),
          explanation_modes_set: new Set(),
          secondary_points_set: new Set(),
          selling_point_contexts_set: new Set(),
          selling_point_components_set: new Set(),
          creatives: [],
          decision_mix: {},
          ...Object.fromEntries(additiveFields.map((field) => [field, 0])),
        });
      }
      const target = pointGroups.get(key);
      const creative = deriveMetrics({ ...source, countries: [...source.countries], content_tag: tag });
      target.material_ids_set.add(source.material_id);
      source.countries.forEach((country) => {
        target.countries_set.add(country);
        target.regions_set.add(regionForCountry(country));
      });
      target.content_directions_set.add(tag.content_direction_l1 || "unclear");
      target.entry_angles_set.add(tag.entry_angle || "unclear");
      target.explanation_modes_set.add(tag.explanation_mode || "unclear");
      (tag.secondary_selling_points || []).forEach((value) => target.secondary_points_set.add(value));
      target.selling_point_contexts_set.add(context);
      (tag.selling_point_components || []).forEach((value) => target.selling_point_components_set.add(value));
      target.creatives.push(creative);
      const decision = source.decision_snapshot?.decision || source.decision || "observe";
      target.decision_mix[decision] = (target.decision_mix[decision] || 0) + 1;
      additiveFields.forEach((field) => {
        target[field] += Number(source[field] || 0);
      });
    });

    const detail = [...pointGroups.values()].map((row) => {
      const decisionPriority = { scale: 0, potential: 1, relative: 2, fatigue: 3, observe: 4, pause: 5 };
      const representatives = [...row.creatives].sort((left, right) => {
        const leftDecision = left.decision_snapshot?.decision || left.decision || "observe";
        const rightDecision = right.decision_snapshot?.decision || right.decision || "observe";
        return (decisionPriority[leftDecision] ?? 9) - (decisionPriority[rightDecision] ?? 9)
          || right.purchase_times - left.purchase_times
          || right.roas - left.roas
          || right.spend - left.spend;
      });
      return {
        ...deriveMetrics(row),
        creative_count: row.material_ids_set.size,
        material_ids: [...row.material_ids_set],
        countries: [...row.countries_set],
        regions: [...row.regions_set],
        content_directions: [...row.content_directions_set],
        entry_angles: [...row.entry_angles_set],
        explanation_modes: [...row.explanation_modes_set],
        secondary_selling_points: [...row.secondary_points_set],
        selling_point_contexts: [...row.selling_point_contexts_set],
        selling_point_components: [...row.selling_point_components_set],
        representative: representatives[0] || null,
        materials: representatives,
        material_ids_set: undefined,
        countries_set: undefined,
        regions_set: undefined,
        content_directions_set: undefined,
        entry_angles_set: undefined,
        explanation_modes_set: undefined,
        secondary_points_set: undefined,
        selling_point_contexts_set: undefined,
        selling_point_components_set: undefined,
        creatives: undefined,
      };
    });

    const byProduct = new Map();
    detail.forEach((row) => {
      if (!byProduct.has(row.standard_product_name)) byProduct.set(row.standard_product_name, []);
      byProduct.get(row.standard_product_name).push(row);
    });
    byProduct.forEach((rows) => {
      const roasValues = rows.filter((row) => row.purchase_times > 0).map((row) => row.roas);
      const ctrValues = rows.map((row) => row.ctr);
      const cvrValues = rows.map((row) => row.cvr);
      const aovValues = rows.filter((row) => row.aov !== null).map((row) => row.aov);
      rows.forEach((row) => {
        const scaleCount = row.decision_mix.scale || 0;
        const potentialCount = row.decision_mix.potential || 0;
        const fatigueCount = row.decision_mix.fatigue || 0;
        const pauseCount = row.decision_mix.pause || 0;
        if (scaleCount > 0 && row.roas >= 2) {
          row.judgement = "conversion";
          row.recommended_action = "scale_variants";
        } else if (potentialCount > 0 && row.roas >= 2) {
          row.judgement = "potential";
          row.recommended_action = "validate_more";
        } else if (fatigueCount > 0 && row.roas >= 2) {
          row.judgement = "fatigue";
          row.recommended_action = "refresh_expression";
        } else if (row.purchase_times >= 3 && row.aov !== null && row.aov >= quantile(aovValues, 0.75)) {
          row.judgement = "high_aov";
          row.recommended_action = "extend_value_scene";
        } else if (row.ctr >= quantile(ctrValues, 0.75) && row.cvr < quantile(cvrValues, 0.5)) {
          row.judgement = "click";
          row.recommended_action = "strengthen_proof";
        } else if (pauseCount > 0 && row.roas < 2) {
          row.judgement = "weak";
          row.recommended_action = "pause_or_remake";
        } else if (row.creative_count >= 3) {
          row.judgement = "expression_optimize";
          row.recommended_action = row.secondary_selling_points.length ? "test_point_combo" : "test_new_expression";
        } else {
          row.judgement = "observe";
          row.recommended_action = "add_samples";
        }
        row.roas_percentile = percentileRank(roasValues, row.roas);
      });
    });

    const overview = [...byProduct.entries()].map(([product, rows]) => {
      const recognized = rows.filter((row) => hasExplicitConsumerBenefit(row));
      const identified = rows.filter((row) => hasIdentifiedSellingPointClaim(row));
      const byCreativeCount = [...identified].sort((left, right) => right.creative_count - left.creative_count || right.spend - left.spend);
      const bySpend = [...identified].sort((left, right) => right.spend - left.spend || right.purchase_value - left.purchase_value);
      const byRoas = identified.filter((row) => row.purchase_times > 0)
        .sort((left, right) => right.roas - left.roas || right.purchase_times - left.purchase_times || right.spend - left.spend);
      return deriveMetrics({
        standard_product_name: product,
        recognized_selling_point_count: recognized.length,
        identified_claim_count: identified.length,
        primary_by_count: byCreativeCount[0] || null,
        top_by_spend: bySpend[0] || null,
        top_by_roas: byRoas[0] || null,
        creative_count: rows.reduce((sum, row) => sum + row.creative_count, 0),
        ...Object.fromEntries(additiveFields.map((field) => [
          field,
          rows.reduce((sum, row) => sum + Number(row[field] || 0), 0),
        ])),
      });
    }).sort((left, right) => right.spend - left.spend || right.purchase_value - left.purchase_value);

    const totals = [...materialRows.values()].reduce((target, row) => {
      target.materials += 1;
      target.spend += Number(row.spend || 0);
      const tag = row.content_tag || contentTags[row.material_id] || contentTags[row.creative_key];
      const normalizedTag = tag ? normalizeContentTag(tag, { product_name: productName(row) }) : null;
      if (normalizedTag && hasExplicitConsumerBenefit(normalizedTag)) {
        target.recognized += 1;
        target.recognized_spend += Number(row.spend || 0);
      }
      if (normalizedTag && hasIdentifiedSellingPointClaim(normalizedTag)) {
        target.identified += 1;
        target.identified_spend += Number(row.spend || 0);
      } else {
        target.unresolved += 1;
        target.unresolved_spend += Number(row.spend || 0);
      }
      return target;
    }, {
      materials: 0,
      recognized: 0,
      identified: 0,
      unresolved: 0,
      spend: 0,
      recognized_spend: 0,
      identified_spend: 0,
      unresolved_spend: 0,
    });

    return {
      overview,
      detail: detail.sort((left, right) => right.spend - left.spend || right.purchase_value - left.purchase_value),
      audit: {
        total_materials: totals.materials,
        recognized_materials: totals.recognized,
        material_coverage: ratio(totals.recognized, totals.materials),
        spend_coverage: ratio(totals.recognized_spend, totals.spend),
        identified_claim_materials: totals.identified,
        identified_claim_coverage: ratio(totals.identified, totals.materials),
        identified_claim_spend: totals.identified_spend,
        identified_claim_spend_coverage: ratio(totals.identified_spend, totals.spend),
        unresolved_materials: totals.unresolved,
        unresolved_spend: totals.unresolved_spend,
      },
    };
  }

  function buildContentDirectionHierarchy(creatives, contentTags = {}, mediaType = "image") {
    const parents = new Map();
    const children = new Map();

    function addRow(groups, key, seed, row) {
      if (!groups.has(key)) {
        groups.set(key, {
          ...seed,
          material_ids_set: new Set(),
          proof_types_set: new Set(),
          offer_types_set: new Set(),
          offer_prominences_set: new Set(),
          entry_angles_set: new Set(),
          explanation_modes_set: new Set(),
          products_set: new Set(),
          countries_set: new Set(),
          regions_set: new Set(),
          creatives_by_id: new Map(),
          ...Object.fromEntries(additiveFields.map((field) => [field, 0])),
        });
      }
      const target = groups.get(key);
      target.material_ids_set.add(row.material_id);
      target.products_set.add(row.standard_product_name || "未识别产品");
      (row.countries || [row.country || "Unknown"]).forEach((country) => {
        target.countries_set.add(country);
        target.regions_set.add(regionForCountry(country));
      });
      if (!target.creatives_by_id.has(row.material_id)) {
        target.creatives_by_id.set(row.material_id, {
          ...row,
          countries: new Set(row.countries || [row.country || "Unknown"]),
          ...Object.fromEntries(additiveFields.map((field) => [field, 0])),
        });
      }
      const sample = target.creatives_by_id.get(row.material_id);
      (row.countries || [row.country || "Unknown"]).forEach((country) => sample.countries.add(country));
      additiveFields.forEach((field) => {
        sample[field] += Number(row[field] || 0);
      });
      additiveFields.forEach((field) => {
        target[field] += Number(row[field] || 0);
      });
      return target;
    }

    creatives.forEach((row) => {
      if (Number(row.spend || 0) <= 0) return;
      const rawTag = contentTags[row.material_id] || contentTags[row.creative_key];
      if (!rawTag) return;
      const tag = normalizeContentTag(rawTag);
      const rowMediaType = row.material_type === "图文"
        ? "image"
        : row.material_type === "视频"
          ? "video"
          : tag.media_type || "image";
      if (rowMediaType !== mediaType) return;
      const direction = tag.content_direction_l1 || "unclear";
      const subtype = tag.content_direction_l2 || "unclear";
      const parent = addRow(parents, direction, {
        row_type: "parent",
        media_type: rowMediaType,
        content_direction_l1: direction,
        content_direction_l2: "",
      }, row);
      const child = addRow(children, `${direction}||${subtype}`, {
        row_type: "child",
        media_type: rowMediaType,
        content_direction_l1: direction,
          content_direction_l2: subtype,
          entry_angles_set: new Set(),
          explanation_modes_set: new Set(),
      }, row);
      if (tag.proof_type) {
        parent.proof_types_set.add(tag.proof_type);
        child.proof_types_set.add(tag.proof_type);
      }
      if (tag.offer_type) {
        parent.offer_types_set.add(tag.offer_type);
        child.offer_types_set.add(tag.offer_type);
      }
      if (tag.offer_prominence) {
        parent.offer_prominences_set.add(tag.offer_prominence);
        child.offer_prominences_set.add(tag.offer_prominence);
      }
      if (tag.entry_angle) {
        parent.entry_angles_set.add(tag.entry_angle);
        child.entry_angles_set.add(tag.entry_angle);
      }
      if (tag.explanation_mode) {
        parent.explanation_modes_set.add(tag.explanation_mode);
        child.explanation_modes_set.add(tag.explanation_mode);
      }
    });

    function selectRepresentatives(values) {
      const creatives = [...values].map((source) => {
        const fullPeriod = deriveMetrics({ ...source, countries: [...source.countries] });
        const decision = source.decision_snapshot;
        if (!decision) return fullPeriod;
        return {
          ...fullPeriod,
          ...decision,
          asset: fullPeriod.asset,
          content_tag: fullPeriod.content_tag,
          full_period_metrics: fullPeriod,
        };
      });
      const bySpend = [...creatives].sort((left, right) => right.spend - left.spend || right.purchase_value - left.purchase_value);
      const decisionPriority = { scale: 0, potential: 1, relative: 2 };
      const positive = creatives
        .filter((row) => Object.hasOwn(decisionPriority, row.decision))
        .sort((left, right) => (
          decisionPriority[left.decision] - decisionPriority[right.decision]
          || right.purchase_times - left.purchase_times
          || right.roas - left.roas
          || right.purchase_value - left.purchase_value
        ));
      const negativePriority = { pause: 0, fatigue: 1 };
      const negative = creatives
        .filter((row) => Object.hasOwn(negativePriority, row.decision))
        .sort((left, right) => (
          negativePriority[left.decision] - negativePriority[right.decision]
          || right.expected_conversions - left.expected_conversions
          || left.roas - right.roas
          || right.spend - left.spend
        ));
      const selected = [];
      const add = (row, role) => {
        if (!row || selected.some((item) => item.material_id === row.material_id)) return;
        selected.push({ ...row, role });
      };
      const best = positive[0];
      if (best) add(best, best.decision === "scale" ? "winner" : best.decision);
      const weakest = negative[0];
      if (weakest) add(weakest, weakest.decision === "pause" ? "low" : "fatigue");
      bySpend.forEach((row) => {
        if (selected.length < 2) add(row, "typical");
      });
      return {
        representative: bySpend[0] || null,
        representatives: selected,
      };
    }

    function buildDimensionBreakdown(values, dimensionKey) {
      const groups = new Map();
      [...values].forEach((source) => {
        const rawTag = source.content_tag || contentTags[source.material_id] || contentTags[source.creative_key];
        const tag = rawTag ? normalizeContentTag(rawTag) : {};
        const value = tag[dimensionKey] || "unclear";
        if (!groups.has(value)) {
          groups.set(value, {
            value,
            material_ids_set: new Set(),
            creatives: [],
            ...Object.fromEntries(additiveFields.map((field) => [field, 0])),
          });
        }
        const target = groups.get(value);
        const creative = deriveMetrics({ ...source, countries: [...source.countries] });
        target.material_ids_set.add(source.material_id);
        target.creatives.push(creative);
        additiveFields.forEach((field) => {
          target[field] += Number(source[field] || 0);
        });
      });
      return [...groups.values()]
        .map((row) => ({
          ...deriveMetrics(row),
          creative_count: row.material_ids_set.size,
          material_ids: [...row.material_ids_set],
          representative: [...row.creatives]
            .sort((left, right) => right.spend - left.spend || right.purchase_value - left.purchase_value)[0] || null,
          material_ids_set: undefined,
          creatives: undefined,
        }))
        .sort((left, right) => right.spend - left.spend || right.purchase_value - left.purchase_value);
    }

    const finalize = (row) => {
      const samples = selectRepresentatives(row.creatives_by_id.values());
      return {
        ...deriveMetrics(row),
        creative_count: row.material_ids_set.size,
        material_ids: [...row.material_ids_set],
        proof_types: [...row.proof_types_set],
        offer_types: [...row.offer_types_set],
        offer_prominences: [...row.offer_prominences_set],
        entry_angles: [...row.entry_angles_set],
        explanation_modes: [...row.explanation_modes_set],
        entry_angle_breakdown: buildDimensionBreakdown(row.creatives_by_id.values(), "entry_angle"),
        explanation_mode_breakdown: buildDimensionBreakdown(row.creatives_by_id.values(), "explanation_mode"),
        product_coverage_count: row.products_set.size,
        country_coverage_count: row.countries_set.size,
        products: [...row.products_set],
        countries: [...row.countries_set],
        regions: [...row.regions_set],
        conclusion_status: row.material_ids_set.size >= 3 ? "supported" : "example_only",
        ...samples,
        material_ids_set: undefined,
        proof_types_set: undefined,
        offer_types_set: undefined,
        offer_prominences_set: undefined,
        entry_angles_set: undefined,
        explanation_modes_set: undefined,
        creatives_by_id: undefined,
      };
    };
    const childRows = [...children.values()].map(finalize);
    const childrenByParent = new Map();
    childRows.forEach((row) => {
      if (!childrenByParent.has(row.content_direction_l1)) childrenByParent.set(row.content_direction_l1, []);
      childrenByParent.get(row.content_direction_l1).push(row);
    });
    return [...parents.values()].map((row) => ({
      ...finalize(row),
      children: childrenByParent.get(row.content_direction_l1) || [],
    }));
  }

  function buildCreativeMatchAuditScope(creatives = []) {
    const compatibleAsset = (row) => {
      if (!row.asset) return false;
      if (row.material_type === "图文") return !row.asset.media_type || row.asset.media_type === "image";
      if (row.material_type === "视频") return !row.asset.media_type || row.asset.media_type === "video";
      return true;
    };
    const compatibleTag = (row) => {
      if (!row.content_tag) return false;
      if (row.material_type === "图文") return !row.content_tag.media_type
        || ["image", "static_video_proxy"].includes(row.content_tag.media_type);
      if (row.material_type === "视频") return !row.content_tag.media_type || row.content_tag.media_type === "video";
      return true;
    };
    const isReviewedProxy = (row) => row.material_type === "图文"
      && row.content_tag?.media_type === "static_video_proxy"
      && row.asset?.media_type === "video";
    const productsByMaterial = new Map();
    creatives.forEach((row) => {
      if (!productsByMaterial.has(row.material_id)) productsByMaterial.set(row.material_id, new Set());
      productsByMaterial.get(row.material_id).add(row.standard_product_name || "未识别产品");
    });
    const productConflicts = [...productsByMaterial.values()].filter((products) => products.size > 1).length;
    const dmsProductMismatches = new Set(creatives.filter((row) => (
      compatibleAsset(row)
      && row.asset?.product_name
      && row.standard_product_name
      && row.asset.product_name !== row.standard_product_name
    )).map((row) => row.material_id)).size;
    return {
      total_creatives: creatives.length,
      total_unique_materials: productsByMaterial.size,
      matched_assets: creatives.filter(compatibleAsset).length,
      unmatched_assets: creatives.filter((row) => !compatibleAsset(row)).length,
      matched_tags: creatives.filter(compatibleTag).length,
      unmatched_tags: creatives.filter((row) => !compatibleTag(row)).length,
      matched_unique_materials: new Set(creatives.filter(compatibleTag).map((row) => row.material_id)).size,
      unmatched_unique_materials: new Set(creatives.filter((row) => !compatibleTag(row)).map((row) => row.material_id)).size,
      exact_code_asset_matches: new Set(creatives.filter(compatibleAsset).map((row) => row.material_id)).size,
      reviewed_proxy_materials: new Set(creatives.filter(isReviewedProxy).map((row) => row.material_id)).size,
      media_conflict_asset_materials: new Set(creatives.filter((row) => row.asset && !compatibleAsset(row)).map((row) => row.material_id)).size,
      meta_product_conflict_materials: productConflicts,
      dms_product_name_mismatches: dmsProductMismatches,
    };
  }

  function buildCreativeMatchAudit(creatives = []) {
    const audit = buildCreativeMatchAuditScope(creatives);
    const mediaScopes = {
      image: creatives.filter((row) => row.material_type === "图文"),
      video: creatives.filter((row) => row.material_type === "视频"),
      co_created: creatives.filter((row) => row.material_type === "合创"),
    };
    return {
      ...audit,
      by_media_type: Object.fromEntries(Object.entries(mediaScopes).map(([key, rows]) => [
        key,
        buildCreativeMatchAuditScope(rows),
      ])),
    };
  }

  function buildContentScopeAudit(allCreatives = [], scopedCreatives = [], contentTags = {}) {
    const uniqueIds = (rows) => new Set(rows.map((row) => row.material_id));
    const taggedRows = scopedCreatives.filter((row) => contentTags[row.material_id] || contentTags[row.creative_key]);
    const eligibleIds = uniqueIds(scopedCreatives);
    const taggedIds = uniqueIds(taggedRows);
    const reviewStatusByMaterial = new Map(taggedRows.map((row) => {
      const tag = contentTags[row.material_id] || contentTags[row.creative_key] || {};
      return [row.material_id, String(tag.review_status || "")];
    }));
    const reviewedIds = new Set([...reviewStatusByMaterial.entries()]
      .filter(([, status]) => status.startsWith("reviewed_"))
      .map(([materialId]) => materialId));
    const pendingReviewIds = new Set([...reviewStatusByMaterial.entries()]
      .filter(([, status]) => status && !status.startsWith("reviewed_"))
      .map(([materialId]) => materialId));
    const missingReviewStatusIds = new Set([...reviewStatusByMaterial.entries()]
      .filter(([, status]) => !status)
      .map(([materialId]) => materialId));
    const totalSpend = scopedCreatives.reduce((sum, row) => sum + Number(row.spend || 0), 0);
    const totalGmv = scopedCreatives.reduce((sum, row) => sum + Number(row.purchase_value || 0), 0);
    const taggedSpend = taggedRows.reduce((sum, row) => sum + Number(row.spend || 0), 0);
    const taggedGmv = taggedRows.reduce((sum, row) => sum + Number(row.purchase_value || 0), 0);
    return {
      eligible_unique_materials: eligibleIds.size,
      tagged_unique_materials: taggedIds.size,
      pending_tag_unique_materials: Math.max(0, eligibleIds.size - taggedIds.size),
      reviewed_unique_materials: reviewedIds.size,
      pending_review_unique_materials: pendingReviewIds.size,
      missing_review_status_unique_materials: missingReviewStatusIds.size,
      excluded_unique_materials: uniqueIds(allCreatives.filter((row) => !explicitAnalysisMaterialCode(row.material_code))).size,
      eligible_spend: totalSpend,
      eligible_gmv: totalGmv,
      tagged_spend: taggedSpend,
      tagged_gmv: taggedGmv,
      tagged_spend_coverage: totalSpend ? taggedSpend / totalSpend : 0,
      tagged_gmv_coverage: totalGmv ? taggedGmv / totalGmv : 0,
    };
  }

  function buildDecisionModel(currentRows = [], previousRows = [], assetIndex = {}, contentTags = {}, options = {}) {
    const decisionRows = options.decisionRows || currentRows;
    const windows = decisionWindows(decisionRows, options.anchorDate || "");
    const recentRows = windows.recent;
    const allContentCreatives = aggregateCreatives(currentRows, { combineCountries: false }).map((row) => ({
      ...row,
      asset: assetIndex[row.material_id] || assetIndex[row.creative_key] || null,
      content_tag: contentTags[row.material_id] || contentTags[row.creative_key] || null,
    }));
    const contentCreatives = options.contentScope === "explicit_material_code"
      ? allContentCreatives.filter((row) => explicitAnalysisMaterialCode(row.material_code))
      : allContentCreatives;
    const creatives = aggregateCreatives(recentRows);
    const baselineCreatives = aggregateCreatives(windows.baseline);
    const priorObservationCreatives = aggregateCreatives(windows.priorObservation);
    const groups = buildGroupBenchmarks(creatives);
    const groupMap = new Map(groups.map((group) => [group.group_key, group]));
    const baselineMap = new Map(baselineCreatives.map((row) => [[row.creative_key, groupKey(row)].join("||"), row]));
    const priorObservationMap = new Map(priorObservationCreatives.map((row) => [[row.creative_key, groupKey(row)].join("||"), row]));
    const cpaIndex = referenceCpaIndex(decisionRows.length ? decisionRows : [...recentRows, ...previousRows]);

    const enriched = creatives.map((sourceRow) => {
      const row = {
        ...sourceRow,
        expected_conversions: expectedConversions(sourceRow, cpaIndex),
      };
      const benchmark = groupMap.get(groupKey(row));
      const identityKey = [row.creative_key, groupKey(row)].join("||");
      const baseline = baselineMap.get(identityKey);
      const priorObservation = priorObservationMap.get(identityKey);
      const result = classify(row, baseline, priorObservation);
      const asset = assetIndex[row.material_id] || assetIndex[row.creative_key] || null;
      const contentTag = contentTags[row.material_id] || contentTags[row.creative_key] || null;
      return {
        ...row,
        benchmark_status: benchmark?.benchmark_status || "single",
        peer_group_size: benchmark?.eligible_count || 0,
        peer_quartiles: benchmark?.quartiles || {},
        peer_percentiles: Object.fromEntries(["roas", "cpa", "ctr", "cvr", "aov"].map((metric) => [
          metric,
          percentileRank(benchmark?.metric_values?.[metric] || [], row[metric]),
        ])),
        decision: result.decision,
        decision_confidence: decisionConfidence(row.evidence_status),
        efficiency_status: result.efficiencyStatus,
        region_label: regionPerformanceLabel(row.region_performance),
        evidence_notes: result.notes,
        trend: result.trend,
        baseline_metrics: baseline || null,
        asset,
        content_tag: contentTag,
      };
    });

    const rankedGroups = new Map();
    enriched.forEach((row) => {
      const key = groupKey(row);
      if (!rankedGroups.has(key)) rankedGroups.set(key, []);
      rankedGroups.get(key).push(row);
    });
    rankedGroups.forEach((rows) => {
      rows.sort((left, right) => (
        right.roas - left.roas
        || right.purchase_times - left.purchase_times
        || right.purchase_value - left.purchase_value
        || left.expected_conversions - right.expected_conversions
      ));
      rows.forEach((row, index) => {
        row.peer_rank = index + 1;
        row.peer_total = rows.length;
        row.peer_top_share = rows.length ? (index + 1) / rows.length : null;
        row.roi_absolute_status = row.roas >= 2 ? "达标" : "未达标";
      });
    });

    const productsWithQualifiedCreative = new Set(enriched
      .filter((row) => row.roas >= 2 && row.purchase_times >= 1)
      .map((row) => row.standard_product_name));
    rankedGroups.forEach((rows) => {
      if (!rows.length || productsWithQualifiedCreative.has(rows[0].standard_product_name)) return;
      const relative = rows.find((row) => row.purchase_times >= 1 && row.decision === "observe");
      if (!relative) return;
      relative.decision = "relative";
      relative.efficiency_status = "品内相对优选，尚未达到扩量线";
      relative.evidence_notes = [
        `同产品、同素材类型排名第${relative.peer_rank}/${relative.peer_total}，ROI ${relative.roas.toFixed(2)}，尚未达到扩量线2.0`,
      ];
    });

    const decisionByIdentity = new Map(enriched.map((row) => [
      [row.creative_key, groupKey(row)].join("||"),
      row,
    ]));
    const decisionContentCreatives = contentCreatives.map((row) => ({
      ...row,
      decision_snapshot: decisionByIdentity.get([row.creative_key, groupKey(row)].join("||")) || null,
    }));

    const decisionOrder = { scale: 0, potential: 1, fatigue: 2, pause: 3, relative: 4, observe: 5 };
    enriched.sort((left, right) => (
      decisionOrder[left.decision] - decisionOrder[right.decision]
      || right.purchase_value - left.purchase_value
      || right.purchase_times - left.purchase_times
      || right.roas - left.roas
    ));
    const lists = Object.fromEntries(["scale", "potential", "fatigue", "pause", "relative", "observe"].map((decision) => [
      decision,
      enriched.filter((row) => row.decision === decision),
    ]));
    return {
      creatives: enriched,
      groups,
      lists,
      decision_window: {
        max_date: windows.maxDate,
        anchor_date: windows.anchorDate,
        max_available_date: windows.maxAvailableDate,
        anchor_has_data: windows.anchorHasData,
        recent_start: windows.recentStart,
        baseline_start: windows.baselineStart,
        baseline_end: windows.baselineEnd,
        recent_row_count: windows.recent.length,
        baseline_row_count: windows.baseline.length,
      },
      content_creatives: decisionContentCreatives,
      content_insights: buildContentInsights(decisionContentCreatives, contentTags),
      content_match_audit: buildCreativeMatchAudit(decisionContentCreatives),
      content_scope_audit: buildContentScopeAudit(allContentCreatives, decisionContentCreatives, contentTags),
      match_audit: buildCreativeMatchAudit(enriched),
    };
  }

  return {
    aggregateCreatives,
    benchmarkStatus,
    buildContentDirectionHierarchy,
    buildContentInsights,
    buildPromotionSummary,
    buildSellingPointPerformance,
    buildCreativeMatchAudit,
    buildDecisionModel,
    creativeIdentity,
    decisionWindows,
    explicitAnalysisMaterialCode,
    regionForCountry,
    regionPerformanceLabel,
    referenceCpaIndex,
    evidenceStatus,
    normalizeContentTag,
    sellingPointFromTag,
    sellingPointDefinitions,
    percentileRank,
    quantile,
  };
});
