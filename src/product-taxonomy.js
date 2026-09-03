(function attachDashboardProductTaxonomy(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardProductTaxonomy = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardProductTaxonomy() {
  const hierarchy = [
    {
      name: "底妆系列",
      children: [
        "底妆合集",
        "粉底棒",
        { name: "气垫系列", children: ["水光气垫", "蓝色气垫", "金色气垫", "气垫合集"] },
        { name: "粉饼系列", children: ["粉饼", "粉饼2件套"] },
        { name: "有色面霜系列", children: ["有色面霜", "有色面霜2件套", "有色面霜3件套"] },
        { name: "有色防晒系列", children: ["有色防晒", "有色防晒2件套", "有色防晒3件套"] },
      ],
    },
    { name: "防晒系列", children: ["防晒合集", "5X防晒", "水感防晒", "哑光防晒"] },
    {
      name: "美白系列",
      children: [
        "美白套组", "美白多件套", "美白面膜套组", "美白4件套", "美白3件套", "美白面膜", "3件套",
        "美白面霜", "美白奶皮面膜", "美白防晒", "美白洗面奶",
      ],
    },
    { name: "水光肌系列", children: ["水光肌2件套", "水光肌3件套"] },
    { name: "PDRN系列", children: ["PDRN套组", "PDRN美白啫喱片", "PDRN面霜", "PDRN精华", "PDRN次抛精华"] },
    { name: "377系列", children: ["377精华", "377面霜", "3772件套", "3773件套"] },
    { name: "5X系列", children: ["5X面霜", "5X面霜清爽版", "5X3件套", "5X4件套", "5X5件套"] },
    { name: "泥膜棒系列", children: ["泥膜棒合集", "火山泥膜棒", "艾草泥膜棒", "美白泥膜棒", "PDRN泥膜棒", "亚马逊白泥泥膜棒", "亚马逊白泥固体泥膜", "复合酸磨皮泥膜棒"] },
    { name: "水油喷雾系列", children: ["水油喷雾", "PDRN水油喷雾", "水油喷雾2件套", "水油喷雾合集"] },
    {
      name: "护肤系列",
      children: [
        "电动眼霜", "红色磨皮精华", "护肤套组", "精华合集", "神经酰胺系列",
        { name: "VC系列", children: ["VC两件套", "VC双舱精华"] },
        { name: "磨皮系列", children: ["磨皮棉片", "磨皮套组"] },
        { name: "视黄醇系列", children: ["视黄醇2件套", "早C晚A 2件套"] },
      ],
    },
    { name: "唇部精华系列", children: ["唇部精华", "唇部精华合集"] },
    { name: "面霜系列", children: ["面霜合集", "素颜霜"] },
    { name: "跨品类", children: ["跨品类"] },
  ];

  return { hierarchy };
});
