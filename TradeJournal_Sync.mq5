//+------------------------------------------------------------------+
//|                                             TradeJournal_Sync.mq5|
//|                                     Copyright 2026, TradeJournal |
//+------------------------------------------------------------------+
#property copyright "TradeJournal"
#property link      ""
#property version   "1.00"

input string WebhookURL = "https://omkjjfxtcdmbdjjeusiu.supabase.co/functions/v1/mt5-sync"; // Webhook URL
input string WebhookToken = "";   // Paste your Sync Token here (from TradeJournal website)

datetime lastSyncTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   if(WebhookURL == "" || WebhookToken == "") {
      Print("Error: Webhook URL and Token must be provided in inputs.");
      return(INIT_FAILED);
   }
   
   // Set last sync time to today so we don't sync years of history on first run
   // (Modify this if you want to sync all history)
   lastSyncTime = TimeCurrent() - (7 * 24 * 60 * 60); // 7 days ago
   
   EventSetTimer(60); // Check for new trades every 60 seconds
   Print("TradeJournal Sync started. Waiting for closed trades...");
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
}

//+------------------------------------------------------------------+
//| Timer function                                                   |
//+------------------------------------------------------------------+
void OnTimer()
{
   SyncClosedTrades();
}

//+------------------------------------------------------------------+
//| Main Sync Logic                                                  |
//+------------------------------------------------------------------+
void SyncClosedTrades()
{
   HistorySelect(lastSyncTime, TimeCurrent());
   int totalDeals = HistoryDealsTotal();
   
   string jsonTrades = "";
   int tradesFound = 0;
   
   for(int i = 0; i < totalDeals; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket > 0)
      {
         long entryType = HistoryDealGetInteger(ticket, DEAL_ENTRY);
         // We only care about closed positions (DEAL_ENTRY_OUT)
         if(entryType == DEAL_ENTRY_OUT)
         {
            long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
            if(dealType == DEAL_TYPE_BUY || dealType == DEAL_TYPE_SELL)
            {
               long posID = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
               string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
               double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
               double closePrice = HistoryDealGetDouble(ticket, DEAL_PRICE);
               double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
               long closeTime = HistoryDealGetInteger(ticket, DEAL_TIME);
               
               // To get open price/time, we must find the DEAL_ENTRY_IN for this position ID
               double openPrice = 0;
               long openTime = 0;
               string typeStr = (dealType == DEAL_TYPE_BUY) ? "sell" : "buy"; // OUT buy means short closed
               
               HistorySelectByPosition(posID);
               int posDeals = HistoryDealsTotal();
               for(int j = 0; j < posDeals; j++) {
                  ulong inTicket = HistoryDealGetTicket(j);
                  if(HistoryDealGetInteger(inTicket, DEAL_ENTRY) == DEAL_ENTRY_IN) {
                     openPrice = HistoryDealGetDouble(inTicket, DEAL_PRICE);
                     openTime = HistoryDealGetInteger(inTicket, DEAL_TIME);
                     typeStr = (HistoryDealGetInteger(inTicket, DEAL_TYPE) == DEAL_TYPE_BUY) ? "long" : "short";
                     break;
                  }
               }
               
               if(openTime > 0)
               {
                  if(tradesFound > 0) jsonTrades += ",";
                  
                  jsonTrades += "{";
                  jsonTrades += "\"ticket\":\"" + IntegerToString(posID) + "\",";
                  jsonTrades += "\"symbol\":\"" + symbol + "\",";
                  jsonTrades += "\"type\":\"" + typeStr + "\",";
                  jsonTrades += "\"volume\":" + DoubleToString(volume, 2) + ",";
                  jsonTrades += "\"open_price\":" + DoubleToString(openPrice, 5) + ",";
                  jsonTrades += "\"close_price\":" + DoubleToString(closePrice, 5) + ",";
                  jsonTrades += "\"profit\":" + DoubleToString(profit, 2) + ",";
                  jsonTrades += "\"open_time\":" + IntegerToString(openTime) + ",";
                  jsonTrades += "\"close_time\":" + IntegerToString(closeTime);
                  jsonTrades += "}";
                  
                  tradesFound++;
                  
                  // Update last sync time so we don't sync this trade again
                  if(closeTime > lastSyncTime) {
                     lastSyncTime = closeTime;
                  }
               }
            }
         }
      }
   }
   
   if(tradesFound > 0)
   {
      string payload = "{\"token\":\"" + WebhookToken + "\",\"trades\":[" + jsonTrades + "]}";
      SendWebhook(payload);
   }
}

//+------------------------------------------------------------------+
//| HTTP POST Request                                                |
//+------------------------------------------------------------------+
void SendWebhook(string payload)
{
   char postData[];
   StringToCharArray(payload, postData, 0, StringLen(payload), CP_UTF8);
   
   char result[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\n";
   
   int res = WebRequest("POST", WebhookURL, headers, 5000, postData, result, resultHeaders);
   
   if(res == 200) {
      Print("TradeJournal Sync successful! Trades synced.");
   } else {
      string body = CharArrayToString(result);
      Print("TradeJournal Sync failed. HTTP code: ", res, ". Error: ", body);
   }
}
